# iOS Location Spoofer Plus — Cloudflare 网页部署 / Cloudflare Web Deployment

这是 Plus 版推荐给新手的免费部署方式。它的目标是像 edgetunnel 一样：部署完成后进入 `/admin`，后台首次生成 TOKEN、生成 Shadowrocket / Surge / Loon / Quantumult X / Stash 模块 URL，并直接提供地图定位管理。

English: This is the recommended no-code Cloudflare deployment path for Plus. Deploy it, open `/admin`, generate TOKEN once, copy the module URL for Shadowrocket, Surge, Loon, Quantumult X, or Stash, and manage locations on the built-in map.

完整中英说明书见：[PROJECT_MANUAL.md](../../PROJECT_MANUAL.md)

## 你最终会得到什么

- 一个免费 Cloudflare 后台。
- 一个带动态地图演示的公开项目首页。
- 一个 `/admin` 管理页面。
- 首次生成的 TOKEN。
- 自动生成的 Shadowrocket / Surge / Loon / Quantumult X / Stash 模块 URL。
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

直接访问根域名会显示公开项目首页。公开地图只播放演示城市，不读取 KV 中的实际坐标；点击“登录系统”进入后台。

打开：

```text
https://你的域名/admin
```

输入 `ADMIN` 后进入后台。

第一次进入时点“生成 TOKEN”，后台会把 TOKEN 保存到 KV，并生成：

```text
地图管理地址
Shadowrocket 模块 URL
Surge 模块 URL
Loon 插件 URL / configUrl
Quantumult X 片段 URL
Stash 覆写 URL
```

## 一站式定位管理

Plus 后台下方会直接显示定位地图。你可以：

1. 搜索地名并点候选。
2. 或直接点地图放置图钉。
3. 调整海拔和精度。
4. 点击“保存定位”。

保存后请关闭一次 iPhone 定位服务再开启。

## 代理工具模块 URL

后台会生成各客户端 URL。Shadowrocket 示例：

```text
https://你的域名/shadowrocket-v2.sgmodule?token=自动生成的TOKEN
```

把它导入 Shadowrocket → 配置 → 模块 → `+` → 来自 URL。

开启 HTTPS 解密和“通过 HTTP/2 进行中间人攻击”。模块会自动注入 `gs-loc.apple.com` 和 `gs-loc-cn.apple.com`，无需在“指定的域名请求”中手填。不要把高德、阿里 DNS、Cloudflare 后台或地图瓦片域名加入 MITM。正式模块使用完整二进制响应、`max-size=0` 和 30 秒脚本超时，并直接从上游主仓库加载脚本。

Plus 版请使用后台生成的对应模块 URL，不要再导入上游静态配置。更换定位时，Shadowrocket、Surge、Loon、Stash 只需要在后台地图保存新坐标，不需要反复重新导入模块。Quantumult X 片段使用当前坐标静态生成，后台修改坐标后需要重新导入或刷新片段。

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

### 模块导入后仍固定在苹果总部

删除 Apple Test、Static Test、上游基础模块、旧 Plus 模块和其他重复定位模块，再从 `/admin` 重新导入并只启用一个正式模块。旧诊断地址从 `v1.0.0` 起返回 `410 Gone`，不再提供可拦截定位的测试配置。

正式方案不要求添加 `DIRECT`、`PROXY`、Fake-IP、DNS 或 CNAME 特例。确认手机浏览器能打开后台域名，并且不要把后台域名加入 HTTPS 解密列表。
