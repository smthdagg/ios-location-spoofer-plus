# Cloudflare 网页后台部署教程

这是给新手使用的 Cloudflare 部署方式，目标是接近 edgetunnel 那种体验：部署完成后打开 `/admin`，后台自动生成 TOKEN，并直接给出地图地址、小火箭模块地址和 Loon `configUrl`。

如果你会命令行，可以使用 [`../worker/`](../worker/) 的 Wrangler 方式。

如果你不想装 Node.js / npm / Wrangler，就用本教程。

## 推荐方式：上传 zip 到 Cloudflare Pages

Cloudflare Pages 的 Direct Upload 支持拖拽 zip。这个项目可以打成只有一个 `_worker.js` 的 zip 包，上传后仍然能运行 Worker API。

zip 包结构应该是：

```text
ios-location-picker-cloudflare.zip
└── _worker.js
```

`_worker.js` 的内容来自本目录的单文件 Worker：

```text
location-picker/cloudflare-webui/worker.js
```

如果你是项目维护者，可以这样生成 zip：

```bash
location-picker/cloudflare-webui/build-pages-zip.sh
```

脚本会在 `location-picker/cloudflare-webui/dist/` 生成 `ios-location-picker-cloudflare.zip`。然后把这个 zip 发给用户即可。

### 上传步骤

1. 打开 Cloudflare Dashboard。
2. 进入 `Workers & Pages`。
3. 点击 `Create application`。
4. 选择 `Pages`。
5. 选择 `Upload assets` / `Direct Upload` / `Drag and drop`。
6. 上传 `ios-location-picker-cloudflare.zip`。
7. 部署完成后，先不要急着打开地图，继续绑定 KV 和设置 ADMIN。

## 备选方式：Worker 网页编辑器复制粘贴

如果你不想用 Pages，也可以直接创建 Worker：

1. Cloudflare Dashboard → `Workers & Pages` → `Create application`。
2. 选择 `Worker`。
3. 进入代码编辑器。
4. 删除默认 Hello World。
5. 粘贴 `location-picker/cloudflare-webui/worker.js` 的全部内容。
6. 点击 `Deploy`。

## 绑定 KV

定位数据、后台会话和自动生成的 TOKEN 都保存在 KV。

1. Cloudflare Dashboard → `Workers & Pages` → `KV`。
2. 创建一个 KV namespace，名字随意，建议叫 `LOC_KV`。
3. 回到刚才的 Pages / Worker 项目。
4. 进入 `Settings` → `Bindings`。
5. 添加 `KV Namespace` 绑定。
6. 变量名必须填：

```text
LOC_KV
```

变量名必须一模一样，不能写成 `loc_kv`、`KV` 或 `LOCATION_KV`。

## 设置 ADMIN

`ADMIN` 是管理后台密码。用户不需要自己生成 TOKEN，TOKEN 进入后台后一键生成。

1. 进入项目的 `Settings`。
2. 找到 `Variables and Secrets`。
3. 添加 Secret。
4. 名字填：

```text
ADMIN
```

5. 值填一个足够长的管理员密码。
6. 保存后重新部署一次。

旧版部署如果已经设置过 `TOKEN`，仍然可以继续用；新版推荐让 `/admin` 把 TOKEN 写入 KV。

## 进入后台

部署地址假设是：

```text
https://ios-location-picker.pages.dev
```

打开：

```text
https://ios-location-picker.pages.dev/admin
```

输入 `ADMIN` 管理密码后进入后台。

后台会显示：

- KV 是否绑定成功
- TOKEN 是否已经生成
- 当前保存的坐标
- 地图地址
- Shadowrocket 小火箭模块地址
- Loon `configUrl`

第一次进入后台时，点击：

```text
自动生成
```

后台会生成一个随机 TOKEN 并保存到 KV。以后用户不需要再去 Cloudflare 手动维护 TOKEN。

## 使用地址

后台会自动生成真实地址。格式如下：

地图页面：

```text
https://你的域名/?token=自动生成的TOKEN
```

Shadowrocket 小火箭模块：

```text
https://你的域名/shadowrocket-v2.sgmodule?token=自动生成的TOKEN
```

Loon `configUrl`：

```text
https://你的域名/loc.json?token=自动生成的TOKEN
```

## 健康检查

打开：

```text
https://你的域名/health
```

正常应该看到类似：

```json
{"ok":true,"kv":true,"tokenConfigured":true,"adminConfigured":true}
```

字段含义：

| 字段 | 正常值 | 说明 |
|------|--------|------|
| `ok` | `true` | Worker / Pages Function 正常 |
| `kv` | `true` | KV 绑定成功 |
| `tokenConfigured` | `true` | TOKEN 已经在 KV 或 Secret 中存在 |
| `adminConfigured` | `true` | ADMIN 管理密码已设置 |

如果 `tokenConfigured` 是 `false`，打开 `/admin` 点“自动生成”即可。

## 绑定自己的域名

你可以给 Pages / Worker 绑定自己的域名，例如：

```text
myloc.example.com
```

然后使用：

```text
https://myloc.example.com/admin
```

后台会自动按当前域名生成地图和模块链接。

如果 Shadowrocket 在代理开启时更新模块出现 TLS 错误，给配置服务器域名加直连规则：

```text
DOMAIN,myloc.example.com,DIRECT
DOMAIN-SUFFIX,workers.dev,DIRECT
```

同时不要把你的配置服务器域名加入 HTTPS 解密列表。

## 地图底图说明

页面默认使用 `OSM 地图`。高德地图和高德卫星主要适合中国大陆、香港、澳门、台湾坐标；定位到英国、美国、欧洲、日本等海外地点时，高德底图可能空白，这是覆盖范围问题，不代表定位保存失败。

建议：

| 位置 | 推荐底图 |
|------|----------|
| 中国大陆 / 港澳台 | `高德地图`、`高德卫星` |
| 海外普通选点 | `OSM 地图`、`Carto 浅色` |
| 海外卫星图 | `Esri 卫星` |
| 看地形 / 海拔 | `OpenTopo 地形` |

定位保存后还要做两件事：

1. 必须在地图上点一下或点搜索结果放置图钉，再点“保存定位”。
2. iPhone 定位服务需要关闭一次再开启，系统才会重新请求定位。

## 常见问题

### 打开 `/admin` 说还差配置

按页面提示检查 `LOC_KV` 和 `ADMIN`。这两个是 Cloudflare 平台级配置，Worker 代码不能替你创建。

### 地图页 403

说明 URL 里的 `token` 不对。进入 `/admin`，复制后台给出的地图地址。

### 小火箭还是没变化

优先检查：

- 是否导入的是 `/shadowrocket-v2.sgmodule?token=...`
- Shadowrocket 模块是否启用
- HTTPS 解密是否开启
- CA 证书是否安装并完全信任
- 保存地图坐标后是否关闭再开启了 iPhone 定位服务

### 高德底图空白

海外坐标请切换到 `OSM 地图`、`Carto 浅色`、`Esri 卫星` 或 `OpenTopo 地形`。
