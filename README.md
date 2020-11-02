[![Serverless Websocket Tencent Cloud](https://img.serverlesscloud.cn/2020210/1581351457765-WebSocket_%E9%95%BF.png)](http://serverless.com)

# 腾讯云 Websocket Serverless Component

腾讯云 Websocket Serverless Component。

快速开始：

1. [**安装**](#1-安装)
2. [**创建**](#2-创建)
3. [**部署**](#3-部署)
4. [**配置**](#4-配置)
5. [**开发调试**](#5-开发调试)
6. [**查看状态**](#6-查看状态)
7. [**移除**](#7-移除)

更多资源：

- [**架构说明**](#架构说明)
- [**账号配置**](#账号配置)

### 1. 安装

通过 npm 安装最新版本的 Serverless Framework

```bash
$ npm install -g serverless
```

### 2. 创建

```bash
$ sls init websocket-starter --name example
$ cd example
```

### 3. 部署

在 `serverless.yml` 文件所在的项目根目录，运行以下指令进行部署：

```bash
$ serverless deploy
```

部署时需要进行身份验证，如您的账号未 [登陆](https://cloud.tencent.com/login) 或 [注册](https://cloud.tencent.com/register) 腾讯云，您可以直接通过 `微信` 扫描命令行中的二维码进行授权登陆和注册。

> 注意: 如果希望查看更多部署过程的信息，可以通过`serverless deploy --debug` 命令查看部署过程中的实时日志信息。

部署成功后，可以通过控制台输出的 `apigw.url` （类似 ws 开头的链接） 进行 websocket 连接。

### 4. 配置

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

点此查看[全量配置及配置说明](https://github.com/serverless-components/tencent-websocket/tree/master/docs/configure.md)

当你根据该配置文件更新配置字段后，再次运行 `serverless deploy` 或者 `serverless` 就可以更新配置到云端。

### 5. 开发调试

部署了 websocket 应用后，可以通过开发调试能力对该项目进行二次开发，从而开发一个生产应用。在本地修改和更新代码后，不需要每次都运行 `serverless deploy` 命令来反复部署。你可以直接通过 `serverless dev` 命令对本地代码的改动进行检测和自动上传。

可以通过在 `serverless.yml`文件所在的目录下运行 `serverless dev` 命令开启开发调试能力。

`serverless dev` 同时支持实时输出云端日志，每次部署完毕后，对项目进行访问，即可在命令行中实时输出调用日志，便于查看业务情况和排障。

除了实时日志输出之外，针对 Node.js 应用，当前也支持云端调试能力。在开启 `serverless dev` 命令之后，将会自动监听远端端口，并将函数的超时时间临时配置为 900s。此时你可以通过访问 chrome://inspect/#devices 查找远端的调试路径，并直接对云端代码进行断点等调试。在调试模式结束后，需要再次部署从而将代码更新并将超时时间设置为原来的值。详情参考[开发模式和云端调试](https://cloud.tencent.com/document/product/1154/43220)。

### 6. 查看状态

在`serverless.yml`文件所在的目录下，通过如下命令查看部署状态：

```
$ serverless info
```

### 7. 移除

在`serverless.yml`文件所在的目录下，通过以下命令移除部署的 Websocket 服务。移除后该组件会对应删除云上部署时所创建的所有相关资源。

```
$ serverless remove
```

和部署类似，支持通过 `serverless remove --debug` 命令查看移除过程中的实时日志信息。

## 架构说明

Websocket 组件将在腾讯云账户中使用到如下 Serverless 服务：

- [x] **API 网关** - API 网关将会接收外部请求并且转发到 SCF 云函数中。
- [x] **SCF 云函数** - 云函数将承载 Websocket 应用。
- [x] **CAM 访问控制** - 该组件会创建默认 CAM 角色用于授权访问关联资源。
- [x] **COS 对象存储** - 为确保上传速度和质量，云函数压缩并上传代码时，会默认将代码包存储在特定命名的 COS 桶中。
- [x] **SSL 证书服务** - 如果你在 yaml 文件中配置了 `apigw.customDomains` 字段，需要做自定义域名绑定并开启 HTTPS 时，也会用到证书管理服务和域名服务。Serverless Framework 会根据已经备案的域名自动申请并配置 SSL 证书。

## 账号配置（可选）

当前默认支持 CLI 扫描二维码登录，如您希望配置持久的环境变量/秘钥信息，也可以本地创建 `.env` 文件

在 `.env` 文件中配置腾讯云的 SecretId 和 SecretKey 信息并保存

如果没有腾讯云账号，可以在此 [注册新账号](https://cloud.tencent.com/register)。

如果已有腾讯云账号，可以在 [API 密钥管理](https://console.cloud.tencent.com/cam/capi) 中获取 `SecretId` 和`SecretKey`.

```text
# .env
TENCENT_SECRET_ID=123
TENCENT_SECRET_KEY=123
```

## License

MIT License

Copyright (c) 2020 Tencent Cloud, Inc.
