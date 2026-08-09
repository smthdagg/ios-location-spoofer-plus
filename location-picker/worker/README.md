# Location Picker — Cloudflare Worker

与 `../server.js` API 完全兼容，免 VPS、自带 HTTPS，支持 **Loon / Shadowrocket / Surge** 的 `configUrl`。

## 接口

| 路径 | 方法 | 说明 |
|------|------|------|
| `/?token=` | GET | 地图选点网页（必须带正确 token） |
| `/loc.json?token=` | GET | 读取坐标 JSON |
| `/set?token=` | POST | 保存坐标 |
| `/shadowrocket.sgmodule?token=` | GET | 自动生成已绑定当前 Worker 的小火箭模块 |
| `/shadowrocket-v2.sgmodule?token=` | GET | 推荐：带当前坐标备用值的小火箭模块 |
| `/shadowrocket-apple.sgmodule?token=` | GET | 诊断：硬编码苹果总部 |
| `/shadowrocket-static.sgmodule?token=` | GET | 诊断：硬编码当前 KV 坐标 |
| `/health` | GET | 健康检查（无需 token） |
| `/enable` | POST | 回到真实位置（再点一下恢复伪造） |

## 部署

> 只想用 Cloudflare 网页后台复制粘贴、不想装 npm / Wrangler 的用户，看这里：[`../cloudflare-webui/`](../cloudflare-webui/)。

### 1. 安装依赖

```bash
cd location-picker/worker
npm install
```

### 2. 创建 KV 命名空间

```bash
npx wrangler kv namespace create LOC_KV
npx wrangler kv namespace create LOC_KV --preview
```

把输出的 `id` 填进 `wrangler.jsonc` 的 `id` 和 `preview_id`。

### 3. 设置访问口令

```bash
npx wrangler secret put TOKEN
# 输入随机字符串，例如 openssl rand -hex 24 生成的值
```

本地开发可复制 `.dev.vars.example` 为 `.dev.vars` 并填写 `TOKEN=...`。

### 4. 部署

```bash
npm run deploy
```

记下输出的地址，例如 `https://ios-location-picker.你的账号.workers.dev`。

## Loon 插件配置

Loon → 设置 → 插件 → iOS Location Spoofer → **远程配置 URL**：

```
https://ios-location-picker.你的账号.workers.dev/loc.json?token=你的TOKEN
```

保存后，在 iPhone 浏览器打开地图页：

```
https://ios-location-picker.你的账号.workers.dev/?token=你的TOKEN
```

搜索并点选候选结果，或直接点地图放置图钉 → **保存定位** → 关开 iPhone 定位服务生效（Loon 约 60 秒内刷新缓存）。

## Shadowrocket 配置

推荐直接导入 Worker 自动生成的小火箭模块：

```
https://ios-location-picker.你的账号.workers.dev/shadowrocket-v2.sgmodule?token=你的TOKEN
```

`v2` 模块会自动带上 `configHost` / `configToken`，并把当前 KV 坐标写成备用值。远程配置短暂读取失败时，也不会回退到苹果总部。

如果你开代理更新模块时遇到 TLS 错误，请把 Worker 域名设为直连：

```
DOMAIN,ios-location-picker.你的账号.workers.dev,DIRECT
DOMAIN-SUFFIX,workers.dev,DIRECT
```

如果 `/loc.json?token=...` 已经是新坐标，但 Apple 地图还是苹果总部，通常就是小火箭仍在使用旧模块或 HTTPS 解密没有启用。删除旧模块后重新导入上面的 `shadowrocket-v2.sgmodule` 地址。

诊断时可导入：

```
https://ios-location-picker.你的账号.workers.dev/shadowrocket-apple.sgmodule?token=你的TOKEN
https://ios-location-picker.你的账号.workers.dev/shadowrocket-static.sgmodule?token=你的TOKEN
```

`apple` 硬编码苹果总部，`static` 硬编码当前 KV 坐标。两个都无效时，优先检查 Shadowrocket 模块启用状态、HTTPS 解密和 CA 证书信任。

## 自定义域名（可选）

在 Cloudflare Dashboard → Workers → 你的 Worker → Settings → Domains 绑定子域即可，例如 `loc.example.com`。

## 地图底图说明

页面默认使用 `OSM 地图`，适合全球坐标。高德地图和高德卫星有时会因为地区、网络线路、代理或服务端风控变成空白。遇到空白时可切换 `OSM 地图`、`Carto 浅色`、`Esri 卫星`、`OpenTopo 地形`；定位功能不依赖高德底图。

## 与 Node 版差异

- 数据存在 **KV**（非本地文件），个人用量免费额度足够
- KV 有秒级最终一致性，保存后 Loon 最多等约 60 秒缓存刷新
- 无需自行管理 HTTPS 证书
