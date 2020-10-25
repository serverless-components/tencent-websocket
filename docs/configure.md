# 配置文档

## 全部配置

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
  faas: # 函数配置相关
    name: websocket # 函数名称
    runtime: Nodejs10.15
    memorySize: 128 # 内存大小，单位MB
    environment: #  环境变量
      variables: #  环境变量数组
        TEST: vale
    vpc: # 私有网络配置
      vpcId: '' # 私有网络的Id
      subnetId: '' # 子网ID
    layers:
      - name: layerName #  layer名称
        version: 1 #  版本
  apigw: #  api网关配置
    isDisabled: false # 是否禁用自动创建 API 网关功能
    serviceId: service-aakldd # API 网关服务 ID
    serviceName: serverless # API 网关服务名称
    enableCORS: true #  允许跨域
    protocols:
      - http
      - https
    environment: test
    serviceTimeout: 15
    customDomains: # 自定义域名绑定
      - domain: abc.com # 待绑定的自定义的域名
        certificateId: abcdefg # 待绑定自定义域名的证书唯一 ID
        # 如要设置自定义路径映射，请设置为 false
        isDefaultMapping: false
        # 自定义路径映射的路径。使用自定义映射时，可一次仅映射一个 path 到一个环境，也可映射多个 path 到多个环境。并且一旦使用自定义映射，原本的默认映射规则不再生效，只有自定义映射路径生效。
        pathMappingSet:
          - path: /
            environment: release
        protocols: # 绑定自定义域名的协议类型，默认与服务的前端协议一致。
          - http # 支持http协议
          - https # 支持https协议
    usagePlan: #  用户使用计划
      usagePlanId: 1111
      usagePlanName: slscmp
      usagePlanDesc: sls create
      maxRequestNum: 1000
    auth: #  密钥
      secretName: secret
      secretIds:
        - xxx
```

## 配置描述

主要的参数

| 参数名称                             | 必选 |     默认值      | 描述                                                           |
| ------------------------------------ | :--: | :-------------: | :------------------------------------------------------------- |
| region                               |  否  | `ap-guangzhou`  | 项目部署所在区域，默认广州区                                   |
| entryFile                            |  否  |    `sls.js`     | 自定义 server 的入口文件名                                     |
| src                                  |  否  | `process.cwd()` | 默认为当前目录, 如果是对象, 配置参数参考 [执行目录](#执行目录) |
| layers                               |  否  |                 | 云函数绑定的 layer, 配置参数参考 [层配置](#层配置)             |
| [functionConf](#函数配置)            |  否  |                 | 函数配置                                                       |
| [apigatewayConf](#API-网关配置)      |  否  |                 | API 网关配置                                                   |
| [cloudDNSConf](#DNS-配置)            |  否  |                 | DNS 配置                                                       |
| [Region special config](#指定区配置) |  否  |                 | 指定区配置                                                     |

## 执行目录

| 参数名称 | 必选 |      类型       | 默认值 | 描述                                                                                                                                                                                 |
| -------- | :--: | :-------------: | :----: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| src      |  否  |     string      |        | 代码路径。与 object 不能同时存在。                                                                                                                                                   |
| exclude  |  否  | Array of string |        | 不包含的文件或路径, 遵守 [glob 语法](https://github.com/isaacs/node-glob)                                                                                                            |
| bucket   |  否  |     string      |        | bucket 名称。如果配置了 src，表示部署 src 的代码并压缩成 zip 后上传到 bucket-appid 对应的存储桶中；如果配置了 object，表示获取 bucket-appid 对应存储桶中 object 对应的代码进行部署。 |
| object   |  否  |     string      |        | 部署的代码在存储桶中的路径。                                                                                                                                                         |

## 层配置

| 参数名称 | 必选 |  类型  | 默认值 | 描述     |
| -------- | :--: | :----: | :----: | :------- |
| name     |  否  | string |        | 层名称   |
| version  |  否  | string |        | 层版本号 |

### DNS 配置

参考: https://cloud.tencent.com/document/product/302/8516

| 参数名称   | 必选 | 类型     | 默认值 | 描述                                            |
| ---------- | :--: | -------- | :----: | :---------------------------------------------- |
| ttl        |  否  | number   | `600`  | TTL 值，范围 1 - 604800，不同等级域名最小值不同 |
| recordLine |  否  | string[] |        | 记录的线路名称                                  |

### 指定区配置

| 参数名称                        | 必选 | 类型   | 默认值 | 函数         |
| ------------------------------- | :--: | ------ | ------ | ------------ |
| [functionConf](#函数配置)       |  否  | object |        | 函数配置     |
| [apigatewayConf](#API-网关配置) |  否  | object |        | API 网关配置 |
| [cloudDNSConf](#DNS-配置)       |  否  | object |        | DNS 配置     |

### 函数配置

参考: https://cloud.tencent.com/document/product/583/18586

| 参数名称     | 必选 |  类型   |    默认值     | 描述                                                                            |
| ------------ | :--: | :-----: | :-----------: | :------------------------------------------------------------------------------ |
| runtime      |  否  |         | `Nodejs10.15` | 执行环境, 目前支持: Nodejs6.10, Nodejs8.9, Nodejs10.15, Nodejs12.16             |
| functionName |  否  |         |               | 云函数名称                                                                      |
| timeout      |  否  | number  |      `3`      | 函数最长执行时间，单位为秒，可选值范围 1-900 秒，默认为 3 秒                    |
| memorySize   |  否  | number  |     `128`     | 函数运行时内存大小，默认为 128M，可选范围 64、128MB-3072MB，并且以 128MB 为阶梯 |
| environment  |  否  | object  |               | 函数的环境变量, 参考 [环境变量](#环境变量)                                      |
| vpcConfig    |  否  | object  |               | 函数的 VPC 配置, 参考 [VPC 配置](#VPC-配置)                                     |
| eip          |  否  | boolean |    `false`    | 是否固定出口 IP                                                                 |

##### 环境变量

| 参数名称  | 类型 | 描述                                      |
| --------- | ---- | :---------------------------------------- |
| variables |      | 环境变量参数, 包含多对 key-value 的键值对 |

##### VPC 配置

| 参数名称 | 类型   | 描述    |
| -------- | ------ | :------ |
| subnetId | string | 子网 ID |
| vpcId    | string | VPC ID  |

### API 网关配置

| 参数名称       | 必选 | 类型     | 默认值     | 描述                                                                               |
| -------------- | :--: | :------- | :--------- | :--------------------------------------------------------------------------------- |
| serviceName    |  否  | string   |            | API 网关服务名称, 默认创建一个新的服务名称                                         |
| serviceId      |  否  |          |            | API 网关服务 ID,如果存在将使用这个 API 网关服务                                    |
| protocols      |  否  | string[] | `['http']` | 前端请求的类型，如 http，https，http 与 https                                      |
| environment    |  否  | string   | `release`  | 发布环境. 目前支持三种发布环境: test（测试）, prepub（预发布） 与 release（发布）. |
| usagePlan      |  否  |          |            | 使用计划配置, 参考 [使用计划](#使用计划)                                           |
| auth           |  否  |          |            | API 密钥配置, 参考 [API 密钥](#API-密钥配置)                                       |
| customDomains  |  否  | object[] |            | 自定义 API 域名配置, 参考 [自定义域名](#自定义域名)                                |
| enableCORS     |  否  | boolean  | `false`    | 开启跨域。默认值为否。                                                             |
| serviceTimeout |  否  | number   | `15`       | Api 超时时间，单位: 秒                                                             |
| isDisabled     |  否  | boolean  | `false`    | 关闭自动创建 API 网关功能。默认值为否，即默认自动创建 API 网关。                   |

##### 使用计划

参考: https://cloud.tencent.com/document/product/628/14947

| 参数名称      | 必选 | 类型   | 描述                                                    |
| ------------- | :--: | ------ | :------------------------------------------------------ |
| usagePlanId   |  否  | string | 用户自定义使用计划 ID                                   |
| usagePlanName |  否  | string | 用户自定义的使用计划名称                                |
| usagePlanDesc |  否  | string | 用户自定义的使用计划描述                                |
| maxRequestNum |  否  | number | 请求配额总数，如果为空，将使用-1 作为默认值，表示不开启 |

##### API 密钥配置

参考: https://cloud.tencent.com/document/product/628/14916

| 参数名称   | 类型   | 描述     |
| ---------- | :----- | :------- |
| secretName | string | 密钥名称 |
| secretIds  | string | 密钥 ID  |

##### 自定义域名

Refer to: https://cloud.tencent.com/document/product/628/14906

| 参数名称         | 必选 |   类型   | 默认值 | 描述                                                                                                                                                                                 |
| ---------------- | :--: | :------: | :----: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain           |  是  |  string  |        | 待绑定的自定义的域名。                                                                                                                                                               |
| certificateId    |  否  |  string  |        | 待绑定自定义域名的证书唯一 ID，如果设置了 type 为 `https`，则为必选                                                                                                                  |
| isDefaultMapping |  否  |  string  | `true` | 是否使用默认路径映射。为 `false` 时，表示自定义路径映射，此时 pathMappingSet 必填。                                                                                                  |
| pathMappingSet   |  否  | object[] |  `[]`  | 自定义路径映射的路径。使用自定义映射时，可一次仅映射一个 path 到一个环境，也可映射多个 path 到多个环境。并且一旦使用自定义映射，原本的默认映射规则不再生效，只有自定义映射路径生效。 |
| protocol         |  否  | string[] |        | 绑定自定义域名的协议类型，默认与服务的前端协议一致。                                                                                                                                 |

- 自定义路径映射

| 参数名称    | 必选 | 类型   | Description    |
| ----------- | :--: | :----- | :------------- |
| path        |  是  | string | 自定义映射路径 |
| environment |  是  | string | 自定义映射环境 |
