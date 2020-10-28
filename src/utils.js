const path = require('path')
const fs = require('fs')
const { Cos } = require('tencent-component-toolkit')
const download = require('download')
const { TypeError } = require('tencent-component-toolkit/src/utils/error')
const CONFIGS = require('./config')

/*
 * Generates a random id
 */
const generateId = () =>
  Math.random()
    .toString(36)
    .substring(6)

const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj))
}

const getType = (obj) => {
  return Object.prototype.toString.call(obj).slice(8, -1)
}

const mergeJson = (sourceJson, targetJson) => {
  Object.entries(sourceJson).forEach(([key, val]) => {
    targetJson[key] = deepClone(val)
  })
  return targetJson
}

const capitalString = (str) => {
  if (str.length < 2) {
    return str.toUpperCase()
  }

  return `${str[0].toUpperCase()}${str.slice(1)}`
}

const getDefaultProtocol = (protocols) => {
  return String(protocols).includes('https') ? 'https' : 'http'
}

const getDefaultFunctionName = () => {
  return `${CONFIGS.compName}_component_${generateId()}`
}

const getDefaultServiceName = () => {
  return 'serverless'
}

const getDefaultServiceDescription = () => {
  return 'Created by Serverless Component'
}

const validateTraffic = (num) => {
  if (getType(num) !== 'Number') {
    throw new TypeError(
      `PARAMETER_${CONFIGS.compName.toUpperCase()}_TRAFFIC`,
      'traffic must be a number'
    )
  }
  if (num < 0 || num > 1) {
    throw new TypeError(
      `PARAMETER_${CONFIGS.compName.toUpperCase()}_TRAFFIC`,
      'traffic must be a number between 0 and 1'
    )
  }
  return true
}

const getDirFiles = async (dirPath) => {
  const targetPath = path.resolve(dirPath)
  const files = fs.readdirSync(targetPath)
  const temp = {}
  files.forEach((file) => {
    temp[file] = path.join(targetPath, file)
  })
  return temp
}

const getCodeZipPath = async (instance, inputs) => {
  console.log(`Packaging ${CONFIGS.compFullname} application...`)

  // unzip source zip file
  let zipPath
  if (!inputs.code.src) {
    // add default template
    const downloadPath = `/tmp/${generateId()}`
    const filename = 'template'

    console.log(`Installing Default ${CONFIGS.compFullname} App...`)
    try {
      await download(CONFIGS.templateUrl, downloadPath, {
        filename: `${filename}.zip`
      })
    } catch (e) {
      throw new TypeError(`DOWNLOAD_TEMPLATE`, 'Download default template failed.')
    }
    zipPath = `${downloadPath}/${filename}.zip`
  } else {
    zipPath = inputs.code.src
  }

  return zipPath
}

/**
 * Upload code to COS
 * @param {Component} instance serverless component instance
 * @param {string} appId app id
 * @param {object} credentials credentials
 * @param {object} inputs component inputs parameters
 * @param {string} region region
 */
const uploadCodeToCos = async (instance, appId, credentials, inputs, region) => {
  const bucketName = inputs.code.bucket || `sls-cloudfunction-${region}-code`
  const objectName = inputs.code.object || `${inputs.name}-${Math.floor(Date.now() / 1000)}.zip`
  // if set bucket and object not pack code
  if (!inputs.code.bucket || !inputs.code.object) {
    const zipPath = await getCodeZipPath(instance, inputs)
    console.log(`Code zip path ${zipPath}`)

    // save the zip path to state for lambda to use it
    instance.state.zipPath = zipPath

    const cos = new Cos(credentials, region)

    if (!inputs.code.bucket) {
      // create default bucket
      await cos.deploy({
        bucket: bucketName + '-' + appId,
        force: true,
        lifecycle: [
          {
            status: 'Enabled',
            id: 'deleteObject',
            filter: '',
            expiration: { days: '10' },
            abortIncompleteMultipartUpload: { daysAfterInitiation: '10' }
          }
        ]
      })
    }

    // upload code to cos
    if (!inputs.code.object) {
      console.log(`Getting cos upload url for bucket ${bucketName}`)
      const uploadUrl = await cos.getObjectUrl({
        bucket: bucketName + '-' + appId,
        object: objectName,
        method: 'PUT'
      })

      // if shims and sls sdk entries had been injected to zipPath, no need to injected again
      console.log(`Uploading code to bucket ${bucketName}`)
      if (instance.codeInjected === true) {
        await instance.uploadSourceZipToCOS(zipPath, uploadUrl, {}, {})
      } else {
        const shimFiles = await getDirFiles(path.join(__dirname, '_shims'))
        await instance.uploadSourceZipToCOS(zipPath, uploadUrl, shimFiles, {})
        instance.codeInjected = true
      }
      console.log(`Upload ${objectName} to bucket ${bucketName} success`)
    }
  }

  // save bucket state
  instance.state.bucket = bucketName
  instance.state.object = objectName

  return {
    bucket: bucketName,
    object: objectName
  }
}

const prepareInputs = async (instance, credentials, inputs = {}) => {
  // 对function inputs进行标准化
  const tempFaasConfig = inputs.faas ? inputs.faas : {}
  const fromClientRemark = `tencent-${CONFIGS.compName}`
  const regionList = inputs.region
    ? typeof inputs.region == 'string'
      ? [inputs.region]
      : inputs.region
    : ['ap-guangzhou']

  // chenck state function name
  const stageFaasName = instance.state[regionList[0]] && instance.state[regionList[0]].name
  const faasConfig = Object.assign(tempFaasConfig, {
    code: {
      src: inputs.src,
      bucket: inputs.srcOriginal && inputs.srcOriginal.bucket,
      object: inputs.srcOriginal && inputs.srcOriginal.object
    },
    name: tempFaasConfig.name || stageFaasName || getDefaultFunctionName(),
    region: regionList,
    role: tempFaasConfig.role || '',
    handler: tempFaasConfig.handler || CONFIGS.handler,
    runtime: tempFaasConfig.runtime || CONFIGS.runtime,
    namespace: tempFaasConfig.namespace || CONFIGS.namespace,
    description: tempFaasConfig.description || CONFIGS.description,
    fromClientRemark,
    layers: tempFaasConfig.layers || [],
    cfs: tempFaasConfig.cfs || [],
    publish: inputs.publish,
    traffic: inputs.traffic,
    lastVersion: instance.state.lastVersion,
    timeout: tempFaasConfig.timeout || CONFIGS.timeout,
    memorySize: tempFaasConfig.memorySize || CONFIGS.memorySize,
    tags: tempFaasConfig.tags || null
  })

  // validate traffic
  if (inputs.traffic !== undefined) {
    validateTraffic(inputs.traffic)
  }
  faasConfig.needSetTraffic = inputs.traffic !== undefined && faasConfig.lastVersion

  if (tempFaasConfig.environment) {
    faasConfig.environment = tempFaasConfig.environment
    faasConfig.environment.variables = faasConfig.environment.variables || {}
    faasConfig.environment.variables.SERVERLESS = '1'
    faasConfig.environment.variables.SLS_ENTRY_FILE = inputs.entryFile || CONFIGS.defaultEntryFile
  } else {
    faasConfig.environment = {
      variables: {
        SERVERLESS: '1',
        SLS_ENTRY_FILE: inputs.entryFile || CONFIGS.defaultEntryFile
      }
    }
  }

  if (tempFaasConfig.vpc) {
    faasConfig.vpcConfig = tempFaasConfig.vpc
  }

  // 对apigw inputs进行标准化
  const tempApigwConfig = inputs.apigw ? inputs.apigw : {}
  const apigwConfig = Object.assign(tempApigwConfig, {
    serviceId: tempApigwConfig.serviceId,
    region: regionList,
    isDisabled: tempApigwConfig.isDisabled === true,
    fromClientRemark: fromClientRemark,
    serviceName: tempApigwConfig.serviceName || getDefaultServiceName(instance),
    serviceDesc: tempApigwConfig.serviceDesc || getDefaultServiceDescription(instance),
    protocols: tempApigwConfig.protocols || ['http'],
    environment: tempApigwConfig.environment ? tempApigwConfig.environment : 'release',
    customDomains: tempApigwConfig.customDomains || []
  })
  if (!apigwConfig.endpoints) {
    apigwConfig.endpoints = [
      {
        path: tempApigwConfig.path || '/',
        enableCORS: tempApigwConfig.enableCORS,
        serviceTimeout: tempApigwConfig.serviceTimeout,
        method: 'GET',
        apiName: tempApigwConfig.apiName || 'index',
        protocol: 'WEBSOCKET',
        function: {
          isIntegratedResponse: false,
          functionName: faasConfig.name,
          functionNamespace: faasConfig.namespace,
          functionQualifier:
            (tempApigwConfig.function && tempApigwConfig.function.functionQualifier) || '$LATEST',
          transportFunctionName: faasConfig.name,
          registerFunctionName: faasConfig.name,
          cleanupFunctionName: faasConfig.name
        }
      }
    ]
  }
  if (tempApigwConfig.usagePlan) {
    apigwConfig.endpoints[0].usagePlan = {
      usagePlanId: tempApigwConfig.usagePlan.usagePlanId,
      usagePlanName: tempApigwConfig.usagePlan.usagePlanName,
      usagePlanDesc: tempApigwConfig.usagePlan.usagePlanDesc,
      maxRequestNum: tempApigwConfig.usagePlan.maxRequestNum
    }
  }
  if (tempApigwConfig.auth) {
    apigwConfig.endpoints[0].auth = {
      secretName: tempApigwConfig.auth.secretName,
      secretIds: tempApigwConfig.auth.secretIds
    }
  }

  regionList.forEach((curRegion) => {
    const curRegionConf = inputs[curRegion]
    if (curRegionConf && curRegionConf.faasConfig) {
      faasConfig[curRegion] = curRegionConf.faasConfig
    }
    if (curRegionConf && curRegionConf.apigwConfig) {
      apigwConfig[curRegion] = curRegionConf.apigwConfig
    }
  })

  return {
    regionList,
    faasConfig,
    apigwConfig
  }
}

module.exports = {
  deepClone,
  generateId,
  uploadCodeToCos,
  mergeJson,
  capitalString,
  getDefaultProtocol,
  prepareInputs
}
