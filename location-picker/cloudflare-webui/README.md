# iOS Location Spoofer Plus — Cloudflare 网页部署

这是 Plus 版推荐给新手的免费部署方式。它的目标是像 edgetunnel 一样：部署完成后进入 `/admin`，后台首次生成 TOKEN、生成小火箭模块 URL，并直接提供地图定位管理。

## 你最终会得到什么

- 一个免费 Cloudflare 后台。
- 一个 `/admin` 管理页面。
- 首次生成的 TOKEN。
- 自动生成的 Shadowrocket 小火箭模块 URL。
- 内嵌地图定位管理：OSM、Carto、Esri 卫星、OpenTopo、高德地图、高德卫星。

## 方式一：上传 zip 到 Cloudflare Pages

项目维护者生成 zip：

```bash
location-picker/cloudflare-webui/build-pages-zip.sh
```

输出文件：

```text
location-picker/cloudflare-webui/dist/ios-location-spoofer-plus-cloudflare.zip
```

zip 结构：

```text
ios-location-spoofer-plus-cloudflare.zip
└── _worker.js
```

用户上传步骤：

1. 打开 Cloudflare Dashboard。
2. 进入 `Workers & Pages`。
3. 点击 `Create application`。
4. 选择 `Pages`。
5. 选择 `Upload assets` / `Direct Upload`。
6. 上传 `ios-location-spoofer-plus-cloudflare.zip`。
7. 等待部署完成。

## 方式二：Worker 网页编辑器复制粘贴

如果不用 Pages zip，也可以用 Worker：

1. Cloudflare Dashboard → `Workers & Pages` → `Create application`。
2. 选择 `Worker`。
3. 进入 `Edit code`。
4. 删除默认 Hello World。
5. 粘贴本文件：

```text
location-picker/cloudflare-webui/worker.js
```

6. 点击 `Deploy`。

## 必须配置：LOC_KV

定位数据、后台会话和 TOKEN 都保存在 KV。

1. Cloudflare Dashboard → `Workers & Pages` → `KV`。
2. 创建一个 KV namespace。
3. 回到你的 Pages / Worker 项目。
4. 进入 `Settings` → `Bindings`。
5. 添加 `KV Namespace`。
6. 变量名必须填：

```text
LOC_KV
```

## 必须配置：ADMIN

`ADMIN` 是 Plus 后台登录密码。

1. 进入项目 `Settings`。
2. 找到 `Variables and Secrets`。
3. 添加 Secret。
4. 名字填：

```text
ADMIN
```

5. 值填一个足够长的密码。
6. 保存后重新部署。

## 进入 Plus 后台

打开：

```text
https://你的域名/admin
```

输入 `ADMIN` 后进入后台。

第一次进入时点“生成 TOKEN”，后台会把 TOKEN 保存到 KV，并生成：

```text
地图管理地址
Shadowrocket 小火箭模块 URL
Loon configUrl
```

## 一站式定位管理

Plus 后台下方会直接显示定位地图。你可以：

1. 搜索地名并点候选。
2. 或直接点地图放置图钉。
3. 调整海拔和精度。
4. 点击“保存定位”。

保存后请关闭一次 iPhone 定位服务再开启。

## 小火箭模块 URL

后台会生成类似：

```text
https://你的域名/shadowrocket-v2.sgmodule?token=自动生成的TOKEN
```

把它导入 Shadowrocket → 配置 → 模块 → `+` → 来自 URL。

## 地图底图说明

| 场景 | 推荐底图 |
|------|----------|
| 中国大陆 / 港澳台 | 高德地图、高德卫星 |
| 海外普通选点 | OSM 地图、Carto 浅色 |
| 海外卫星图 | Esri 卫星 |
| 看地形 / 海拔 | OpenTopo 地形 |

高德底图在海外空白是覆盖范围问题，不代表定位保存失败。

## 健康检查

打开：

```text
https://你的域名/health
```

正常返回：

```json
{"ok":true,"kv":true,"tokenConfigured":true,"adminConfigured":true}
```

如果 `tokenConfigured` 是 `false`，进入 `/admin` 点“生成 TOKEN”。

TOKEN 生成后日常不需要再操作。后台只保留“重新生成 TOKEN 并重置所有参数”，用于需要废弃旧模块 URL、恢复默认定位参数的情况。

## 常见问题

### `/admin` 提示还差配置

检查 `LOC_KV` 和 `ADMIN`，保存后重新部署。

### 地图页 403

TOKEN 不对，回 `/admin` 复制完整链接。

### 开代理更新模块 TLS 报错

给配置服务器域名加直连规则：

```text
DOMAIN,你的域名,DIRECT
DOMAIN-SUFFIX,workers.dev,DIRECT
```

不要把你的 Cloudflare 后台域名加入 Shadowrocket HTTPS 解密列表。
