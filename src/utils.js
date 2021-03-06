const path = require('path')
const fs = require('fs')
const { Cos } = require('tencent-component-toolkit')
const download = require('download')
const { ApiTypeError } = require('tencent-component-toolkit/lib/utils/error')

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

const capitalString = (str) => {
  if (str.length < 2) {
    return str.toUpperCase()
  }

  return `${str[0].toUpperCase()}${str.slice(1)}`
}

const getTimestamp = () => {
  return Math.floor(Date.now() / 1000)
}

const getDefaultProtocol = (protocols) => {
  return String(protocols).includes('https') ? 'https' : 'http'
}

const getDefaultFunctionName = (framework) => {
  return `${framework}-${generateId()}`
}

const getDefaultServiceName = () => {
  return 'serverless'
}

const getDefaultServiceDescription = () => {
  return 'Created by Serverless Component'
}

const getDefaultBucketName = (region) => {
  return `serverless-${region}-code`
}

const getDefaultObjectName = (inputs) => {
  return `${inputs.name}-${getTimestamp()}.zip`
}

const getDirFiles = (dirPath) => {
  const targetPath = path.resolve(dirPath)
  const files = fs.readdirSync(targetPath)
  const temp = {}
  files.forEach((file) => {
    temp[file] = path.join(targetPath, file)
  })
  return temp
}

const getCodeZipPath = async (instance, inputs) => {
  const { CONFIGS, framework } = instance
  console.log(`Packaging ${framework} application`)

  // unzip source zip file
  let zipPath
  if (!inputs.code.src) {
    // add default template
    const downloadPath = `/tmp/${generateId()}`
    const filename = 'template'

    console.log(`Downloading default ${framework} application`)
    try {
      await download(CONFIGS.templateUrl, downloadPath, {
        filename: `${filename}.zip`
      })
    } catch (e) {
      throw new ApiTypeError(`DOWNLOAD_TEMPLATE`, 'Download default template failed.')
    }
    zipPath = `${downloadPath}/${filename}.zip`
  } else {
    zipPath = inputs.code.src
  }

  return zipPath
}

// get files/dirs need to inject to project code
const getInjection = () => {
  let injectFiles = {}
  const injectDirs = {}
  const shimPath = path.join(__dirname, '_shims')
  injectFiles = getDirFiles(shimPath)

  return { injectFiles, injectDirs }
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
  const { CONFIGS, framework } = instance
  const bucketName = inputs.code.bucket || getDefaultBucketName(region)
  const objectName = inputs.code.object || getDefaultObjectName(inputs)
  const bucket = `${bucketName}-${appId}`

  const zipPath = await getCodeZipPath(instance, inputs)
  console.log(`Code zip path ${zipPath}`)

  // save the zip path to state for lambda to use it
  instance.state.zipPath = zipPath

  const cos = new Cos(credentials, region)

  if (!inputs.code.bucket) {
    // create default bucket
    await cos.deploy({
      force: true,
      bucket: bucketName + '-' + appId,
      lifecycle: CONFIGS.cos.lifecycle
    })
  }
  if (!inputs.code.object) {
    console.log(`Getting cos upload url for bucket ${bucketName}`)
    const uploadUrl = await cos.getObjectUrl({
      bucket: bucket,
      object: objectName,
      method: 'PUT'
    })

    // if shims and sls sdk entries had been injected to zipPath, no need to injected again
    console.log(`Uploading code to bucket ${bucketName}`)

    const { injectFiles, injectDirs } = getInjection(instance, framework)

    await instance.uploadSourceZipToCOS(zipPath, uploadUrl, injectFiles, injectDirs)
    console.log(`Upload ${objectName} to bucket ${bucketName} success`)
  }

  // save bucket state
  instance.state.bucket = bucketName
  instance.state.object = objectName

  return {
    bucket: bucketName,
    object: objectName
  }
}

// compatible code for old configs
// transfer yaml config to sdk inputs
const yamlToSdkInputs = ({ instance, faasConfig, apigwConfig }) => {
  // transfer faas config
  if (faasConfig.environments) {
    // this is new config array to object
    const environment = deepClone(faasConfig.environments)
    faasConfig.environment = {
      variables: {
        SERVERLESS: '1',
        SLS_ENTRY_FILE: instance.slsEntryFile
      }
    }
    environment.forEach((item) => {
      faasConfig.environment.variables[item.key] = item.value
    })
  } else {
    faasConfig.environment = {
      variables: {
        SERVERLESS: '1',
        SLS_ENTRY_FILE: instance.slsEntryFile
      }
    }
  }

  if (faasConfig.vpc) {
    faasConfig.vpcConfig = faasConfig.vpc
  }

  if (faasConfig.tags) {
    const tags = deepClone(faasConfig.tags)
    faasConfig.tags = {}
    tags.forEach((item) => {
      faasConfig.tags[item.key] = item.value
    })
  }

  // transfer apigw config
  apigwConfig.serviceId = apigwConfig.id
  apigwConfig.serviceName = apigwConfig.name || getDefaultServiceName(instance)
  apigwConfig.serviceDesc = apigwConfig.description || getDefaultServiceDescription(instance)

  if (apigwConfig.customDomains && apigwConfig.customDomains.length > 0) {
    apigwConfig.customDomains = apigwConfig.customDomains.map((item) => {
      return {
        domain: item.domain,
        certificateId: item.certId,
        isDefaultMapping: !item.customMap,
        pathMappingSet: item.pathMap,
        protocols: item.protocols
      }
    })
  }

  return { faasConfig, apigwConfig }
}

const initializeInputs = async (instance, inputs = {}) => {
  const { CONFIGS, state } = instance
  const region = inputs.region || CONFIGS.region

  // chenck state function name
  const stateFaasName = state.faas && state.faas.name
  const stateApigwId = state.apigw && (state.apigw.id || state.apigw.serviceId)

  const tempFaasConfig = inputs.faas || {}
  const faasConfig = Object.assign(tempFaasConfig, {
    region: region,
    code: {
      src: inputs.src.src,
      bucket: inputs.srcOriginal && inputs.srcOriginal.bucket,
      object: inputs.srcOriginal && inputs.srcOriginal.object
    },
    name: tempFaasConfig.name || stateFaasName || getDefaultFunctionName(),
    role: tempFaasConfig.role || '',
    handler: tempFaasConfig.handler || CONFIGS.handler,
    runtime: tempFaasConfig.runtime || CONFIGS.runtime,
    namespace: tempFaasConfig.namespace || CONFIGS.namespace,
    description: tempFaasConfig.description || CONFIGS.description,
    layers: tempFaasConfig.layers || [],
    cfs: tempFaasConfig.cfs || [],
    timeout: tempFaasConfig.timeout || CONFIGS.timeout,
    memorySize: tempFaasConfig.memorySize || CONFIGS.memorySize
  })

  const slsEntryFile = inputs.entryFile || CONFIGS.defaultEntryFile
  instance.slsEntryFile = slsEntryFile

  const tempApigwConfig = inputs.apigw || {}
  const apigwConfig = Object.assign(tempApigwConfig, {
    region,
    id: tempApigwConfig.id || stateApigwId,
    isDisabled: tempApigwConfig.isDisabled === true,
    protocols: tempApigwConfig.protocols || ['http'],
    environment: tempApigwConfig.environment || 'release',
    endpoints: [
      {
        path: '/',
        apiName: 'index',
        method: 'GET',
        enableCORS: tempApigwConfig.cors,
        serviceTimeout: tempApigwConfig.timeout,
        protocol: 'WEBSOCKET',
        function: {
          isIntegratedResponse: false,
          functionQualifier: tempApigwConfig.qualifier || '$DEFAULT',
          functionName: faasConfig.name,
          functionNamespace: faasConfig.namespace,
          transportFunctionName: faasConfig.name,
          registerFunctionName: faasConfig.name,
          cleanupFunctionName: faasConfig.name
        }
      }
    ]
  })

  return {
    region,
    ...yamlToSdkInputs({ instance, faasConfig, apigwConfig })
  }
}

module.exports = {
  deepClone,
  generateId,
  uploadCodeToCos,
  capitalString,
  getDefaultProtocol,
  initializeInputs
}
