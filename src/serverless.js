const { Component } = require('@serverless/core')
const { Scf, Apigw } = require('tencent-component-toolkit')
const { ApiTypeError } = require('tencent-component-toolkit/lib/utils/error')
const { migrateFramework } = require('@slsplus/migrate')
const { uploadCodeToCos, getDefaultProtocol, initializeInputs, deepClone } = require('./utils')
const initConfigs = require('./config')

class ServerlessComponent extends Component {
  getCredentials() {
    const { tmpSecrets } = this.credentials.tencent

    if (!tmpSecrets || !tmpSecrets.TmpSecretId) {
      throw new ApiTypeError(
        'CREDENTIAL',
        'Cannot get secretId/Key, your account could be sub-account and does not have the access to use SLS_QcsRole, please make sure the role exists first, then visit https://cloud.tencent.com/document/product/1154/43006, follow the instructions to bind the role to your account.'
      )
    }

    return {
      SecretId: tmpSecrets.TmpSecretId,
      SecretKey: tmpSecrets.TmpSecretKey,
      Token: tmpSecrets.Token
    }
  }

  getAppId() {
    return this.credentials.tencent.tmpSecrets.appId
  }

  initialize(framework = 'websocket') {
    const CONFIGS = initConfigs(framework)
    this.CONFIGS = CONFIGS
    this.framework = framework
    this.__TmpCredentials = this.getCredentials()
  }

  async deployFaas(credentials, inputs) {
    const appId = this.getAppId()
    const { region } = inputs
    const { state } = this
    const instance = this
    const funcDeployer = async () => {
      const code = await uploadCodeToCos(instance, appId, credentials, inputs, region)
      const scf = new Scf(credentials, region)
      const tempInputs = {
        ...inputs,
        code
      }
      const scfOutput = await scf.deploy(deepClone(tempInputs))
      const outputs = {
        name: scfOutput.FunctionName,
        runtime: scfOutput.Runtime,
        namespace: scfOutput.Namespace
      }

      // default version is $LATEST
      outputs.lastVersion = scfOutput.LastVersion
        ? scfOutput.LastVersion
        : (state.faas && state.faas.lastVersion) || '$LATEST'

      // default traffic is 1.0, it can also be 0, so we should compare to undefined
      outputs.traffic =
        scfOutput.Traffic !== undefined
          ? scfOutput.Traffic
          : (state.faas && state.faas.traffic) !== undefined
          ? state.faas.traffic
          : 1

      if (outputs.traffic !== 1 && scfOutput.ConfigTrafficVersion) {
        outputs.configTrafficVersion = scfOutput.ConfigTrafficVersion
      }

      return outputs
    }

    const faasOutputs = await funcDeployer(region)

    this.state.faas = faasOutputs
    await this.save()

    return faasOutputs
  }

  async deployApigw(credentials, inputs) {
    if (inputs.isDisabled) {
      return {}
    }

    const { region } = inputs
    const { state } = this

    const apigwDeployer = async () => {
      const apigw = new Apigw(credentials, region)

      const oldState = state.apigw || {}
      const apigwInputs = {
        ...inputs,
        oldState: {
          apis: oldState.apis || [],
          customDomains: oldState.customDomains || []
        }
      }
      // different region deployment has different service id
      apigwInputs.serviceId = inputs.id || (state.apigw && state.apigw.id)
      const apigwOutput = await apigw.deploy(deepClone(apigwInputs))
      apigwOutput.apiList = apigwOutput.apiList.map((item) => {
        item.created = true
        return item
      })
      const outputs = {
        url: `${getDefaultProtocol(apigwInputs.protocols) === 'https' ? 'wss' : 'ws'}://${
          apigwOutput.subDomain
        }/${apigwOutput.environment}${apigwInputs.endpoints[0].path}`,
        id: apigwOutput.serviceId,
        domain: apigwOutput.subDomain,
        environment: apigwOutput.environment,
        wsBackUrl: apigwOutput.apiList[0].internalDomain,
        apis: apigwOutput.apiList
      }

      if (apigwOutput.customDomains) {
        outputs.customDomains = apigwOutput.customDomains
      }
      return outputs
    }

    const apigwOutputs = await apigwDeployer()

    this.state.apigw = apigwOutputs
    await this.save()

    return apigwOutputs
  }

  async updateFaas(credentials, inputs, wsBackUrl) {
    // after websocket api create, we should add wsBackUrl environment for cloud function
    console.log(`Start add wsBackUrl environment variable for function ${inputs.name}`)
    inputs.environment = inputs.environment || {}
    inputs.environment.variables.wsBackUrl = wsBackUrl

    const scf = new Scf(credentials, inputs.region)
    await scf.scf.updateConfigure(inputs)

    console.log(`Add wsBackUrl environment variable for function ${inputs.name} successfully`)
  }

  async deploy(inputs) {
    inputs = migrateFramework(inputs)

    this.initialize()
    const { __TmpCredentials, CONFIGS } = this

    console.log(`Deploying ${this.framework} Application`)

    const { region, faasConfig, apigwConfig } = await initializeInputs(this, inputs)

    const outputs = {
      region
    }
    if (!faasConfig.code.src) {
      outputs.templateUrl = CONFIGS.templateUrl
    }

    const faasOutputs = await this.deployFaas(__TmpCredentials, faasConfig)
    let apigwOutputs
    // support apigw.isDisabled
    if (apigwConfig.isDisabled !== true) {
      apigwOutputs = await this.deployApigw(__TmpCredentials, apigwConfig)
    } else {
      this.state.apigw.isDisabled = true
    }

    const { wsBackUrl } = apigwOutputs

    await this.updateFaas(__TmpCredentials, faasConfig, wsBackUrl)

    outputs['faas'] = faasOutputs
    outputs['apigw'] = apigwOutputs

    // this config for online debug
    this.state.region = region
    this.state.namespace = faasConfig.namespace
    this.state.lambdaArn = faasConfig.name

    return outputs
  }

  async remove() {
    this.initialize()
    const { __TmpCredentials, framework } = this

    console.log(`Removing ${framework} App`)

    const { state } = this
    const { region } = state

    let { faas: faasState, apigw: apigwState } = state
    if (!faasState) {
      const curState = state[region]
      faasState = {
        name: curState.name,
        namespace: curState.namespace
      }
    }
    if (!apigwState) {
      const curState = state[region]
      apigwState = {
        id: curState.serviceId,
        environment: curState.environment,
        apis: curState.apiList,
        customDomains: curState.customDomains
      }
    }
    const scf = new Scf(__TmpCredentials, region)
    const apigw = new Apigw(__TmpCredentials, region)
    try {
      // if disable apigw, no need to remove
      const serviceId = apigwState.id || apigwState.serviceId
      if (apigwState.isDisabled !== true && serviceId) {
        apigwState.apis = apigwState.apis.map((item) => {
          item.created = true
          return item
        })
        await apigw.remove({
          created: true,
          serviceId: serviceId,
          environment: apigwState.environment,
          apiList: apigwState.apis || apigwState.apiList || [],
          customDomains: apigwState.customDomains
        })
      }

      await scf.remove({
        functionName: faasState.name,
        namespace: faasState.namespace
      })
    } catch (e) {
      console.log(e)
    }

    this.state = {}

    return {}
  }
}

module.exports = ServerlessComponent
