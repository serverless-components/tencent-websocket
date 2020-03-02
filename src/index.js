const ensureIterable = require('type/iterable/ensure')
const ensurePlainObject = require('type/plain-object/ensure')
const ensureString = require('type/string/ensure')
const random = require('ext/string/random')
const path = require('path')
const { Component } = require('@serverless/core')

const DEFAULTS = {
  runtime: 'Nodejs8.9',
  handler: 'entry.socket',
  exclude: ['.git/**', '.gitignore', '.serverless', '.DS_Store']
}

class TencentWebsocket extends Component {
  getDefaultProtocol(protocols) {
    if (protocols.map((i) => i.toLowerCase()).includes('https')) {
      return 'https'
    }
    return 'http'
  }

  /**
   * prepare create function inputs
   * @param {object} inputs inputs
   */
  async prepareInputs(inputs = {}) {
    inputs.name =
      ensureString(inputs.functionName, { isOptional: true }) ||
      this.state.functionName ||
      `SocketComponent_${random({ length: 6 })}`
    inputs.codeUri = ensureString(inputs.code, { isOptional: true }) || process.cwd()
    inputs.region = ensureString(inputs.region, { default: 'ap-guangzhou' })

    inputs.include = ensureIterable(inputs.include, { default: [] })
    inputs.include = inputs.include.concat([path.join(__dirname, 'shims')])
    inputs.exclude = ensureIterable(inputs.exclude, { default: [] })
    inputs.exclude = inputs.exclude.concat(DEFAULTS.exclude)

    inputs.handler = ensureString(inputs.handler, { default: DEFAULTS.handler })
    inputs.runtime = ensureString(inputs.runtime, { default: DEFAULTS.runtime })
    inputs.apigatewayConf = ensurePlainObject(inputs.apigatewayConf, { default: {} })

    if (inputs.functionConf) {
      inputs.timeout = inputs.functionConf.timeout ? inputs.functionConf.timeout : 3
      inputs.memorySize = inputs.functionConf.memorySize ? inputs.functionConf.memorySize : 128
      inputs.environment = ensurePlainObject(inputs.apigatewayConf, { default: {} })
      if (inputs.functionConf.environment) {
        inputs.environment = inputs.functionConf.environment
      }
      if (inputs.functionConf.vpcConfig) {
        inputs.vpcConfig = inputs.functionConf.vpcConfig
      }
    }

    return inputs
  }

  async default(inputs = {}) {
    inputs = await this.prepareInputs(inputs)

    const tencentCloudFunction = await this.load('@serverless/tencent-scf')
    // const tencentApiGateway = await this.load('@serverless/tencent-apigateway')
    const tencentApiGateway = await this.load('@serverless/tencent-apigateway')

    const tencentCloudFunctionOutputs = await tencentCloudFunction(inputs)
    const apigwParam = {
      serviceName: inputs.serviceName,
      description: 'Serverless Framework tencent-websocket Component',
      serviceId: inputs.serviceId,
      region: inputs.region,
      protocols: inputs.apigatewayConf.protocols || ['http'],
      environment:
        inputs.apigatewayConf && inputs.apigatewayConf.environment
          ? inputs.apigatewayConf.environment
          : 'release',
      endpoints: [
        {
          path: '/',
          serviceTimeout: inputs.apigatewayConf.serviceTimeout || 3,
          protocol: 'WEBSOCKET',
          method: 'GET',
          function: {
            isIntegratedResponse: false,
            functionName: tencentCloudFunctionOutputs.Name,
            transportFunctionName: tencentCloudFunctionOutputs.Name,
            registerFunctionName: tencentCloudFunctionOutputs.Name,
            cleanupFunctionName: tencentCloudFunctionOutputs.Name
          }
        }
      ],
      customDomain: inputs.apigatewayConf.customDomain
    }

    if (inputs.apigatewayConf && inputs.apigatewayConf.auth) {
      apigwParam.endpoints[0].usagePlan = inputs.apigatewayConf.usagePlan
    }
    if (inputs.apigatewayConf && inputs.apigatewayConf.auth) {
      apigwParam.endpoints[0].auth = inputs.apigatewayConf.auth
    }

    const tencentApiGatewayOutputs = await tencentApiGateway(apigwParam)
    const wsBackUrl = tencentApiGatewayOutputs.apis[0].internalDomain

    const apiProtocol = this.getDefaultProtocol(tencentApiGatewayOutputs.protocols)
    const outputs = {
      region: inputs.region,
      functionName: inputs.name,
      apiGatewayServiceId: tencentApiGatewayOutputs.serviceId,
      url: `${apiProtocol === 'https' ? 'wss' : 'ws'}://${tencentApiGatewayOutputs.subDomain}/${
        tencentApiGatewayOutputs.environment
      }/`,
      wsBackUrl: wsBackUrl
    }

    if (tencentApiGatewayOutputs.customDomains) {
      outputs.customDomains = tencentApiGatewayOutputs.customDomains
    }

    // after websocket api create, we should add wsBackUrl environment for cloud function
    this.context.debug(`Start add wsBackUrl environment variable for cloud function ${inputs.name}`)
    inputs.environment.variables.wsBackUrl = wsBackUrl
    await tencentCloudFunction.updateBaseConf(inputs)

    this.state = outputs

    await this.save()

    return outputs
  }

  async remove() {
    this.context.status('Removing')
    const tencentCloudFunction = await this.load('@serverless/tencent-scf')
    const tencentApiGateway = await this.load('@serverless/tencent-apigateway')

    await tencentCloudFunction.remove()
    await tencentApiGateway.remove()

    this.state = {}
    await this.save()
    return {}
  }
}

module.exports = TencentWebsocket
