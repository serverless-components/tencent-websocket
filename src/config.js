const CONFIGS = () => {
  return {
    injectSlsSdk: true,
    compName: 'websocket',
    compFullname: 'Websocket',
    defaultEntryFile: 'sls.js',
    region: 'ap-guangzhou',
    runtime: 'Nodejs10.15',
    description: 'Created by Serverless Component',
    handler: 'sl_handler.handler',
    timeout: 10,
    memorySize: 128,
    namespace: 'default',
    cos: {
      lifecycle: [
        {
          status: 'Enabled',
          id: 'deleteObject',
          filter: '',
          expiration: { days: '10' },
          abortIncompleteMultipartUpload: { daysAfterInitiation: '10' }
        }
      ]
    }
  }
}

module.exports = CONFIGS
