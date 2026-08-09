# iOS Location Spoofer Plus

免费的一站式 iPhone 定位管理项目：用 Shadowrocket 的 HTTPS 解密能力拦截 Apple 定位响应，再用 Cloudflare 免费后台生成 TOKEN、生成小火箭模块 URL，并直接在后台地图上修改定位。

这个仓库现在按 **Plus 独立分支项目** 维护。原始 MITM 定位逻辑来自 [acheong08/ios-location-spoofer](https://github.com/acheong08/ios-location-spoofer) 的研究，JavaScript 版参考 [mekos2772/ios-location-spoofer](https://github.com/mekos2772/ios-location-spoofer)。Plus 版重点不再只是“给模块改参数”，而是把部署、TOKEN、模块 URL、地图选点、底图切换和定位保存做成一个免费后台。

> 新手直接看：[Plus 小白教程](使用教程.md)

## Plus 版做什么

- **手机端照旧**：Shadowrocket 小火箭仍然负责 HTTPS 解密、安装 CA 证书、拦截 Apple 定位接口。
- **Cloudflare 免费后台**：类似 edgetunnel 的使用方式，只需要部署 Worker / Pages、绑定 KV、设置 `ADMIN`。
- **自动生成 TOKEN**：进入 `/admin` 后一键生成，不再让小白手动找随机字符串。
- **自动生成小火箭模块 URL**：后台直接给出 `/shadowrocket-v2.sgmodule?token=...`。
- **后台内置地图定位管理**：OSM、Carto、Esri 卫星、OpenTopo、高德地图、高德卫星都作为后台的一部分使用。
- **一站式免费使用**：个人使用 Cloudflare 免费额度通常足够，无需 VPS、无需自签服务端证书。

## 使用路线

### 第一部分：手机端基础设置

这部分和原项目一致，核心是：

1. Shadowrocket 导入模块。
2. 打开 HTTPS 解密。
3. 安装并完全信任 CA 证书。
4. 确认 MITM 域名包含：

```text
gs-loc.apple.com
gs-loc-cn.apple.com
bluedot.is.autonavi.com
bluedot.is.autonavi.com.gds.alibabadns.com
```

手机端这部分不需要大改，按 [使用教程.md](使用教程.md) 第一部分操作即可。

### 第二部分：Cloudflare Plus 后台部署

推荐用 Cloudflare Pages zip 上传或 Worker 单文件部署：

- 新手网页部署 / zip 上传：[location-picker/cloudflare-webui](location-picker/cloudflare-webui/)
- 命令行 Wrangler 部署：[location-picker/worker](location-picker/worker/)

部署后只需要两个 Cloudflare 配置：

| 配置 | 变量名 | 用途 |
|------|--------|------|
| KV 绑定 | `LOC_KV` | 保存定位、TOKEN、后台会话 |
| Secret | `ADMIN` | 管理后台登录密码 |

然后打开：

```text
https://你的域名/admin
```

登录后点击“自动生成”，后台会生成 TOKEN，并给出：

```text
地图管理地址
Shadowrocket 小火箭模块 URL
Loon configUrl
当前坐标状态
```

### 第三部分：后台地图定位管理

Plus 后台会直接内嵌地图，不需要再单独打开另一个页面。

使用顺序：

1. 进入 `/admin`。
2. 点击“自动生成”生成 TOKEN。
3. 后台地图自动出现。
4. 搜索地点并点候选，或直接点地图放置图钉。
5. 点击“保存定位”。
6. iPhone 定位服务关闭一次再开启，让系统重新请求定位。

底图说明：

| 场景 | 推荐底图 |
|------|----------|
| 中国大陆 / 港澳台 | 高德地图、高德卫星 |
| 海外普通选点 | OSM 地图、Carto 浅色 |
| 海外卫星图 | Esri 卫星 |
| 看地形 / 海拔 | OpenTopo 地形 |

高德底图在海外空白是覆盖范围问题，不代表定位保存失败。

## Shadowrocket 模块

Plus 推荐使用后台自动生成的小火箭模块 URL：

```text
https://你的域名/shadowrocket-v2.sgmodule?token=自动生成的TOKEN
```

`v2` 模块会自动写入：

- 当前保存坐标作为备用值
- `configHost`
- `configToken`
- 小火箭脚本地址

这样网页后台保存新坐标后，小火箭读取 `/loc.json` 即可生效。

## 文件清单

```text
ios-location-spoofer.sgmodule           # 原始 Shadowrocket / Surge 静态模块
ios-location-spoofer.lnplugin           # Loon 插件
ios-location-spoofer.snippet            # Quantumult X 配置
ios-location-spoofer.stoverride         # Stash 覆写
location-spoofer.js                     # 核心脚本
location-picker/cloudflare-webui/       # Plus 网页部署 / zip 上传版
location-picker/worker/                 # Plus Wrangler Worker 版
location-picker/server.js               # Node 自托管版，保留给 VPS/NAS 用户
使用教程.md                              # 小白教程
```

## 安全说明

- `/admin` 需要 `ADMIN` 管理密码。
- 用户访问地图和模块需要 TOKEN。
- 新版 TOKEN 优先保存在 KV，旧版 `TOKEN` Secret 仍然兼容。
- 不要把配置服务器域名加入 Shadowrocket HTTPS 解密列表。
- 如果开代理更新模块时 TLS 报错，给你的 Cloudflare 域名加 `DIRECT` 规则。

## 生效提醒

保存定位后，iPhone 不一定立刻重新请求定位。请关闭一次 **设置 → 隐私与安全性 → 定位服务**，等 10 秒再打开；必要时重复几次，并重开地图 App。
