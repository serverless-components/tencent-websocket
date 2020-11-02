[![Serverless Websocket Tencent Cloud](https://img.serverlesscloud.cn/2020210/1581351457765-WebSocket_%E9%95%BF.png)](http://serverless.com)

# 腾讯云 Websocket Serverless Component

## 简介

腾讯云 Websocket Serverless Component。

## 目录

1. [准备](#1-准备)
2. [安装](#2-安装)
3. [配置](#3-配置)
4. [部署](#4-部署)
5. [移除](#5-移除)

### 1. 准备

#### 初始化 Websocket 项目

创建 `Websocket` 入口文件 `app.js`，它包含了事件处理函数，每个事件函数会传入连个参数，第一个是客户后端发送的数据 `data` 字段，第二个是 `socket` 对象，示例如下：

```js
// 当 socket 连接成功时触发
on('connect', async (data, socket) => {
  // id - socket 唯一标识的链接 ID，可以将它存储在数据库中，进行管理
  const { id, event, send } = socket

  return 200
})

// 当 socket 断开时触发
on('disconnect', async (data, socket) => {
  // 例如：你可以将链接 id 记录从数据库中删除
})

// 当客户端发送数据时触发
on('message', async (data, socket) => {
  // 发送数据到客户端，data 必须是字符串
  await socket.send(data)
})

// 除以上事件的默认处理函数
on('default', async (data, socket) => {
  // 你可以发送数据到指定的链接
  await socket.send(data)
})
```

For a real world example of how the `app.js` file could be used, take a look at how the [chat app component is using it](https://github.com/serverless-components/chat-app/blob/master/backend/socket.js).

### 2. 安装

通过 npm 全局安装 [serverless cli](https://github.com/serverless/serverless)

```bash
$ npm install -g serverless
```

### 3. 配置

在项目根目录，创建 `serverless.yml` 文件，在其中进行如下配置

```bash
$ touch serverless.yml
```

```yml
# serverless.yml

app: appDemo
stage: dev

component: websocket
name: websocketDemo

inputs:
  region: ap-guangzhou
  src:
    src: ./
    exclude:
      - .env
  faas:
    name: websocket-function
    timeout: 10
  apigw:
    timeout: 30
    environment: release
    protocols:
      - https
```

- [更多配置](https://github.com/serverless-components/tencent-websocket/tree/master/docs/configure.md)

### 4. 部署

如您的账号未 [登录](https://cloud.tencent.com/login) 或 [注册](https://cloud.tencent.com/register) 腾讯云，您可以直接通过 `微信` 扫描命令行中的二维码进行授权登陆和注册。

通过 `sls` 命令进行部署，并可以添加 `--debug` 参数查看部署过程中的信息

```bash
$ sls deploy --debug
```

### 5. 移除

通过以下命令移除部署的 API 网关

```bash
$ sls remove --debug
```

### 账号配置（可选）

当前默认支持 CLI 扫描二维码登录，如您希望配置持久的环境变量/秘钥信息，也可以本地创建 `.env` 文件

在 `.env` 文件中配置腾讯云的 SecretId 和 SecretKey 信息并保存

如果没有腾讯云账号，可以在此 [注册新账号](https://cloud.tencent.com/register)。

如果已有腾讯云账号，可以在 [API 密钥管理](https://console.cloud.tencent.com/cam/capi) 中获取 `SecretId` 和`SecretKey`.

```text
# .env
TENCENT_SECRET_ID=123
TENCENT_SECRET_KEY=123
```

## 更多组件

可以在 [Serverless Components](https://github.com/serverless/components) repo 中查询更多组件的信息。

## License

MIT License

Copyright (c) 2020 Tencent Cloud, Inc.
