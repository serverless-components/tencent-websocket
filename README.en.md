# Tencent Websocket Serverless Component

[![Serverless Websocket Tencent Cloud](https://img.serverlesscloud.cn/2020210/1581351457765-WebSocket_%E9%95%BF.png)](http://serverless.com)

[简体中文](https://github.com/serverless-components/tencent-websocket/README.md) | English

&nbsp;

## Introduction

Websocket Serverless Component for Tencent Cloud.

## Content

1. [Prepare](#1-prepare)
2. [Install](#2-install)
3. [Create](#3-create)
4. [Configure](#4-configure)
5. [Deploy](#5-deploy)
6. [Remove](#6-Remove)

### 1. Prepare

#### Initial Socket Project

create `socket` entry file `app.js`, it contains socket event handlers. Each handler takes two arguments, the first is the `data` passed in from the client, and the second is the `socket` object, which contains helpful data and methods.

```js
// this function gets triggered on new connections
// if not provided, connections are successful by default
on('connect', async (data, socket) => {
  // the following data are available in the socket object
  // id represnets the connection id of a certain client
  const { id, event, send } = socket

  // you can return status codes directly
  return 200
})

// this function gets triggered whenever a client disconnects
// if not provided, disconnection is not handled
on('disconnect', async (data, socket) => {
  // e.g. business logic that removes connection ids from a db table
})

// this function gets triggered whenever a client sends data to the specified route
// in this example, you're handling the "message" route
// so clients need to send the following JSON data: { "route": "message", "data": { "foo": "bar" } }
on('message', async (data, socket) => {
  // you can send data to the connected client with the send() function
  await socket.send(data)
})

// this function gets triggered to handle any other data that is not handled above
on('default', async (data, socket) => {
  // you can also send data to a specific connection id (that you might have saved in a table)
  // this is very useful for a broadcasting functionality
  await socket.send(data)
})
```

### 2. Install

Install the Serverless Framework globally:

```shell
$ npm install -g serverless
```

### 3. Create

Just create the following simple boilerplate:

```shell
$ touch serverless.yml
$ touch .env           # your Tencent api keys
```

Add the access keys of a [Tencent CAM Role](https://console.cloud.tencent.com/cam/capi) with `AdministratorAccess` in the `.env` file, using this format:

```
# .env
TENCENT_SECRET_ID=XXX
TENCENT_SECRET_KEY=XXX
```

- If you don't have a Tencent Cloud account, you could [sign up](https://intl.cloud.tencent.com/register) first.

### 4. Configure

```yml
# serverless.yml

MyComponent:
  component: '@serverless/tencent-websocket'
  inputs:
    region: ap-guangzhou
    functionName: socket-function
    code: ./
    functionConf:
      timeout: 10
      memorySize: 128
      environment:
        variables:
          TEST: vale
      vpcConfig:
        subnetId: ''
        vpcId: ''
    apigatewayConf:
      protocol: https
      environment: release
```

- [More Options](https://github.com/serverless-components/tencent-websocket/tree/master/docs/configure.md)

### 5. Deploy

```shell
$ sls --debug
```

> Notice: `sls` is short for `serverless` command.

&nbsp;

### 6. Remove

```shell
$ sls remove --debug
```

### More Components

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.
