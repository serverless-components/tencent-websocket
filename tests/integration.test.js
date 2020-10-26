require('dotenv').config()
const { generateId, getServerlessSdk } = require('./utils')
const path = require('path')

// set enough timeout for deployment to finish
jest.setTimeout(300000)

// the yaml file we're testing against
const instanceYaml = {
  org: 'orgDemo',
  app: 'appDemo',
  component: 'websocket',
  name: `websocket-integration-tests-${generateId()}`,
  stage: 'dev',
  inputs: {
    src: {
      src: path.join(__dirname, '..', 'example'),
      exclude: [ '.env' ],
    },
    region: 'ap-guangzhou',
    faas: { name: `websocket-test`, runtime: 'Nodejs10.15' },
    apigw: { environment: 'test' }
  }
}

const credentials = {
  tencent: {
    SecretId: process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.TENCENT_SECRET_KEY,
  }
}

// get serverless construct sdk
const sdk = getServerlessSdk(instanceYaml.org)

it('should successfully deploy websocket app', async () => {
  const instance = await sdk.deploy(instanceYaml, credentials)

  expect(instance).toBeDefined()
  expect(instance.instanceName).toEqual(instanceYaml.name)
  // get src from template by default
  expect(instance.outputs.region).toEqual(instanceYaml.inputs.region)
  expect(instance.outputs.apigw).toBeDefined()
  expect(instance.outputs.apigw.environment).toEqual(instanceYaml.inputs.apigw.environment)
  expect(instance.outputs.faas).toBeDefined()
  expect(instance.outputs.faas.name).toEqual(instanceYaml.inputs.faas.name)
  expect(instance.outputs.faas.runtime).toEqual(instanceYaml.inputs.faas.runtime)
})

it('should successfully remove websocket app', async () => {
  await sdk.remove(instanceYaml, credentials)
  result = await sdk.getInstance(instanceYaml.org, instanceYaml.stage, instanceYaml.app, instanceYaml.name)

  expect(result.instance.instanceStatus).toEqual('inactive')
})
