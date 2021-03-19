const { ServerlessSDK } = require('@serverless/platform-client-china')

/*
 * Generate random id
 */
const generateId = () =>
  Math.random()
    .toString(36)
    .substring(6)

/*
 * Initializes and returns an instance of the serverless sdk
 * @param ${string} orgName - the serverless org name.
 */
const getServerlessSdk = (orgName, orgUid) => {
  const sdk = new ServerlessSDK({
    context: {
      orgUid,
      orgName
    }
  })
  return sdk
}

module.exports = { generateId, getServerlessSdk }
