# Cloudflare 网页后台部署教程

这是一份给新手看的 Cloudflare Worker 网页后台部署教程。它不要求本地安装 Node.js、npm 或 Wrangler，也不要求理解多文件 Worker 项目结构。

如果你会命令行，推荐使用 [`../worker/`](../worker/) 里的 Wrangler 部署方式。  
如果你只想在 Cloudflare 网页后台复制粘贴，请使用本目录的单文件 Worker：

```text
location-picker/cloudflare-webui/worker.js
```

## 这份教程解决什么问题

`location-picker/server.js` 是 Node/VPS/NAS 版，不适合直接部署到 Cloudflare Worker。Cloudflare Worker 也不能使用 Node 的 `http`、`https`、`fs` 和本地 `loc.json`。

Cloudflare 正确结构是：

```text
Cloudflare Worker：提供地图页面和 API
Cloudflare KV：保存当前坐标
Worker Secret：保存访问口令 TOKEN
```

为了避免 Cloudflare 在线编辑器的多文件入口问题，本目录提供了一个已经合并好的 `worker.js`。把它复制到 Cloudflare Worker 默认代码文件即可。

## 一、创建 Worker

1. 打开 Cloudflare Dashboard。
2. 进入：

```text
Workers & Pages
```

3. 点击：

```text
Create application
```

4. 选择：

```text
Worker
```

不要选择 Pages。这个工具需要 API 和 KV，不是静态网站。

5. Worker 名字可以填：

```text
ios-location-picker
```

6. 创建后进入 Worker，点击：

```text
Edit code
```

## 二、复制单文件 worker.js

1. 打开本目录的：

```text
location-picker/cloudflare-webui/worker.js
```

2. 复制全部内容。
3. 回到 Cloudflare 的代码编辑器。
4. 找到默认文件，通常叫：

```text
worker.js
```

或者 Cloudflare 默认显示的 Hello World 文件。

5. 删除原来的 Hello World 代码。
6. 粘贴本目录 `worker.js` 的全部内容。
7. 点击：

```text
Deploy
```

部署后访问带 TOKEN 的 Worker 主页，如果能看到地图页面，说明代码部分已经成功。例如：

```text
https://你的Worker地址/?token=你的TOKEN
```

不带 TOKEN 访问主页应该返回 403。

## 三、创建 KV

1. 回到 Cloudflare Dashboard。
2. 进入：

```text
Workers & Pages
```

3. 找到：

```text
KV
```

或：

```text
Workers KV
```

4. 创建一个 namespace。
5. 名字建议填：

```text
LOC_KV
```

## 四、绑定 KV 到 Worker

1. 进入你的 Worker。
2. 进入：

```text
Settings
```

3. 找到：

```text
Bindings
```

4. 点击：

```text
Add binding
```

5. 类型选择：

```text
KV Namespace
```

6. 变量名必须填：

```text
LOC_KV
```

7. 选择刚才创建的 KV namespace。
8. 保存。

注意：变量名必须一模一样。不能写成 `loc_kv`、`KV` 或 `LOCATION_KV`。

## 五、添加 TOKEN

TOKEN 是地图保存和配置读取的访问口令。

1. 进入 Worker 的：

```text
Settings
```

2. 找到：

```text
Variables and Secrets
```

3. 点击添加变量。
4. 类型选择：

```text
Secret
```

5. 名字填：

```text
TOKEN
```

6. 值填一串足够长的随机字符，例如：

```text
把这里换成你自己的随机字符串
```

可以用密码管理器生成，也可以用其他随机字符串生成器。不要使用 `123456`、生日、手机号等弱口令。

保存后，如果 Cloudflare 提示重新部署，请再点一次 Deploy。

## 六、检查是否成功

假设 Worker 地址是：

```text
https://ios-location-picker.你的账号.workers.dev
```

打开：

```text
https://ios-location-picker.你的账号.workers.dev/health
```

必须看到：

```json
{"ok":true,"kv":true,"tokenConfigured":true}
```

字段含义：

| 字段 | 正常值 | 说明 |
|------|--------|------|
| `ok` | `true` | Worker 正常 |
| `kv` | `true` | KV 绑定成功 |
| `tokenConfigured` | `true` | TOKEN 已配置 |

如果看到：

```json
{"ok":true,"kv":false,"tokenConfigured":true}
```

说明 KV 没绑定好。回到 Bindings，检查变量名是否是：

```text
LOC_KV
```

如果看到：

```json
{"ok":true,"kv":true,"tokenConfigured":false}
```

说明 TOKEN 没加好。回到 Variables and Secrets，添加 Secret：

```text
TOKEN
```

## 七、绑定自己的域名

如果不想用很长的 `workers.dev` 地址，可以绑定自己的域名。

例如：

```text
myloc.example.com
```

操作：

1. 进入你的 Worker。
2. 进入：

```text
Settings
```

3. 找到：

```text
Domains & Routes
```

或：

```text
Triggers
```

4. 点击：

```text
Add Custom Domain
```

5. 填你的域名：

```text
myloc.example.com
```

6. 保存。

如果域名 DNS 已经托管在 Cloudflare，Cloudflare 会自动处理 DNS 和 HTTPS 证书。

绑定成功后检查：

```text
https://myloc.example.com/health
```

正常应该返回：

```json
{"ok":true,"kv":true,"tokenConfigured":true}
```

## 八、Shadowrocket 小火箭配置

推荐直接导入 Worker 自动生成的小火箭模块：

```text
https://你的域名/shadowrocket-v2.sgmodule?token=你的TOKEN
```

如果没有自定义域名，就使用 Worker 地址：

```text
https://ios-location-picker.你的账号.workers.dev/shadowrocket-v2.sgmodule?token=你的TOKEN
```

`v2` 模块会自动写入：

```text
configHost=https://你的域名
configToken=你的TOKEN
```

同时它会把当前 `/loc.json` 里的坐标写成模块内置备用值。即使小火箭临时读不到远程配置，也不会回退到苹果总部。

导入后，你在网页地图点“保存定位”，小火箭脚本就会读取同一个 Worker 的 `/loc.json`。不要再导入项目根目录那个默认 `ios-location-spoofer.sgmodule` 当最终使用模块；那个文件里的备用坐标是苹果总部，适合手动改参数，不适合网页实时更新。

如果你开代理更新模块时遇到 TLS 错误，请把配置服务器域名设置为直连。例如：

```text
DOMAIN,你的域名,DIRECT
DOMAIN-SUFFIX,workers.dev,DIRECT
```

配置服务器域名只用于下载模块、脚本和读取坐标，不需要加入 HTTPS 解密；HTTPS 解密只需要 Apple 定位相关域名。

## 九、地图怎么用

最容易漏的一点：

```text
搜索地点不等于已经写入配置，但点搜索结果会自动放置图钉。
```

正确流程：

1. 打开地图页面：

```text
https://你的域名/?token=你的TOKEN
```

2. 搜索地点。
3. 点一个搜索结果，地图会移动过去并自动放置图钉。
4. 确认图钉位置正确后，点击：

```text
保存定位
```

6. 看到已保存提示。

然后检查：

```text
https://你的域名/loc.json?token=你的TOKEN
```

如果里面的经纬度已经变化，说明 Cloudflare 保存成功。

## 十、iPhone 上生效步骤

保存地图定位后：

1. 小火箭断开重连。
2. iPhone 关开定位服务。
3. 打开 Apple 地图测试。

如果还是没变，检查：

- 小火箭模块是否真的启用
- HTTPS 解密 / MITM 是否开启
- CA 证书是否已安装并信任
- 是否导入的是 `shadowrocket-v2.sgmodule`
- `loc.json?token=...` 返回的经纬度是否已经变化

## 十一、常见问题

### 访问主页不带 token 也能看到地图，安全吗？

新版单文件 Worker 已经收紧为：地图主页也必须带正确 TOKEN 才能打开。

不带 TOKEN 访问：

```text
https://你的域名/
```

应该返回：

```json
{"error":"bad token"}
```

不带 TOKEN 访问：

```text
https://你的域名/loc.json
```

应该返回：

```json
{"error":"bad token"}
```

这说明坐标接口没有裸露。

### `/health` 正常，但小火箭没变化

先检查：

```text
https://你的域名/loc.json?token=你的TOKEN
```

如果经纬度还是默认：

```text
37.3349, -122.00902
```

说明你还没有选择搜索结果/放置图钉并保存。

如果 `/loc.json` 已经变成你选的新坐标，但 Apple 地图还是苹果总部，说明小火箭还在用旧模块或旧缓存。请删除旧模块后重新导入：

```text
https://你的域名/shadowrocket-v2.sgmodule?token=你的TOKEN
```

然后重新连接小火箭，并关开一次 iPhone 定位服务。

如果 `v2` 动态模块仍异常，可用两个诊断模块定位问题：

```text
https://你的域名/shadowrocket-apple.sgmodule?token=你的TOKEN
https://你的域名/shadowrocket-static.sgmodule?token=你的TOKEN
```

`apple` 模块硬编码苹果总部；`static` 模块硬编码当前 `/loc.json` 坐标。两个都不生效时，优先检查 Shadowrocket 模块是否启用、HTTPS 解密是否开启、CA 证书是否完全信任。

### 搜索后没变化

搜索后要点一个候选结果；点候选结果会自动放图钉。最后仍然需要点“保存定位”写入 KV。

### 高德地图 / 高德卫星一片空白

高德底图有时会因为地区、网络线路、代理或服务端风控变成空白。这是底图加载问题，不代表定位保存失败。

页面默认使用 `OSM 地图`。如果高德地图或高德卫星空白，先切回 OSM 选点保存；定位功能不依赖高德底图。

也可以切换 `Carto 浅色`、`Esri 卫星`、`OpenTopo 地形`。这几个是免 key 的全球底图，通常比高德更适合海外定位点。

### Cloudflare 显示 Hello World

说明你没有替换默认 `worker.js`，或者部署的不是当前 Worker。

请重新打开 Worker 的 Edit code，把本目录里的 `worker.js` 全部复制进去，然后 Deploy。

### 报 `Unexpected token '<'`

说明你复制了 GitHub 网页 HTML，不是真正的 JS 文件。

请使用本目录里的：

```text
worker.js
```

不要复制 GitHub 网页源码。

## 十二、最终使用模板

地图页面：

```text
https://你的域名/?token=你的TOKEN
```

Loon / 其他客户端 configUrl：

```text
https://你的域名/loc.json?token=你的TOKEN
```

小火箭模块导入地址：

```text
https://你的域名/shadowrocket-v2.sgmodule?token=你的TOKEN
```
