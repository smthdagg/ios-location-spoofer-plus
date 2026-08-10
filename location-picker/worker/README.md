# iOS Location Spoofer Plus — Wrangler Worker

这是 Plus 版的命令行部署方式，适合熟悉 npm / Wrangler 的用户。新手推荐看 [`../cloudflare-webui/`](../cloudflare-webui/) 的 zip / 网页部署方式。

## 接口

| 路径 | 方法 | 说明 |
|------|------|------|
| `/admin` | GET/POST | Plus 管理后台：登录、生成 TOKEN、复制模块 URL、地图定位管理 |
| `/?token=` | GET | 地图选点页面，也会内嵌在 `/admin` |
| `/loc.json?token=` | GET | 当前坐标 JSON |
| `/set?token=` | POST | 保存坐标 |
| `/enable?token=` | POST | 恢复真实定位 / 再启用伪造 |
| `/shadowrocket-v2.sgmodule?token=` | GET | Shadowrocket 模块 |
| `/shadowrocket.sgmodule?token=` | GET | 兼容旧链接 |
| `/surge.sgmodule?token=` | GET | Surge 模块 |
| `/loon.lnplugin?token=` | GET | Loon 插件 |
| `/quantumultx.snippet?token=` | GET | Quantumult X 静态片段 |
| `/stash.stoverride?token=` | GET | Stash 覆写 |
| `/shadowrocket-apple.sgmodule?token=` | GET | 诊断模块：苹果总部 |
| `/shadowrocket-static.sgmodule?token=` | GET | 诊断模块：当前 KV 坐标 |
| `/location-spoofer-qx.js` | GET | Quantumult X 动态坐标脚本出口 |
| `/health` | GET | 健康检查 |

## 部署

### 1. 安装依赖

```bash
cd location-picker/worker
npm install
```

### 2. 创建 KV

```bash
npx wrangler kv namespace create LOC_KV
npx wrangler kv namespace create LOC_KV --preview
```

把输出的 `id` 填进 `wrangler.jsonc`。

### 3. 设置 ADMIN

```bash
npx wrangler secret put ADMIN
```

输入一个足够长的后台管理密码。

新版不要求手动设置 `TOKEN`。进入 `/admin` 后首次生成 TOKEN 并保存到 KV。旧部署如果已经设置过 `TOKEN` Secret，仍然兼容。

### 4. 部署

```bash
npm run deploy
```

默认 Worker 名称是：

```text
ios-location-spoofer-plus
```

部署后打开：

```text
https://ios-location-spoofer-plus.你的账号.workers.dev/admin
```

## Plus 后台

登录 `/admin` 后点击“生成 TOKEN”，后台会给出：

- Shadowrocket 模块 URL
- Surge 模块 URL
- Loon 插件 URL / `configUrl`
- Quantumult X 片段 URL
- Stash 覆写 URL
- 地图管理地址
- 当前坐标
- KV / TOKEN / ADMIN 状态

后台下方会直接内嵌地图，可直接搜索、点选、保存定位。

TOKEN 生成后日常不需要再操作。后台只保留“重新生成 TOKEN 并重置所有参数”，用于需要废弃旧模块 URL、恢复默认定位参数的情况。

## 代理工具模块

推荐从 `/admin` 复制对应客户端的完整模块 URL。Shadowrocket 示例：

```text
https://你的域名/shadowrocket-v2.sgmodule?token=自动生成的TOKEN
```

导入后确认：

- 模块已启用。
- HTTPS 解密已打开。
- CA 证书已完全信任。
- 保存定位后关闭再开启 iPhone 定位服务。

其他客户端从后台复制对应 URL：

- Surge：`surge.sgmodule`
- Loon：`loon.lnplugin`
- Stash：`stash.stoverride`
- Quantumult X：`quantumultx.snippet`，这是当前坐标静态片段，后台改坐标后需要重新导入或刷新。

如果自定义域名在手机浏览器无法访问，在 Worker 变量中设置 `CLIENT_ORIGIN=https://你的-worker.你的子域.workers.dev`。后台仍可使用自定义域名，手机模块和动态坐标会改用原生地址。

若全局代理能访问、配置模式不能访问，则该域名必须走代理：

```text
DOMAIN,你的域名,PROXY
```

## 地图底图

| 场景 | 推荐底图 |
|------|----------|
| 中国大陆 / 港澳台 | 高德地图、高德卫星 |
| 海外普通选点 | OSM 地图、Carto 浅色 |
| 海外卫星图 | Esri 卫星 |
| 看地形 / 海拔 | OpenTopo 地形 |

高德海外空白是覆盖范围问题，不影响定位保存。

## 本地开发

复制 `.dev.vars.example`：

```bash
cp .dev.vars.example .dev.vars
```

填写：

```text
ADMIN=你的后台密码
```

然后：

```bash
npm run dev
```
