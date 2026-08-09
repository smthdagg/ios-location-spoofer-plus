# iOS Location Spoofer Plus

中文 | [English](#english)

免费的一站式 iPhone 定位管理项目。手机端使用 Shadowrocket 的 HTTPS 解密能力拦截 Apple 定位响应，Cloudflare 端提供 Plus 管理后台：首次生成 TOKEN、生成小火箭模块 URL、直接在地图上保存定位。

![Plus 管理后台](docs/assets/admin-dashboard.png)

## 项目定位

`iOS Location Spoofer Plus` 是一个独立分支项目。它保留上游 JavaScript 定位修改逻辑，同时把部署、TOKEN、模块链接、地图选点和调试流程做成 Cloudflare 免费后台。

上游参考：

- [acheong08/ios-location-spoofer](https://github.com/acheong08/ios-location-spoofer)
- [mekos2772/ios-location-spoofer](https://github.com/mekos2772/ios-location-spoofer)

Plus 版维护：

- Developer: **SMTH DAGG**
- Repo: [smthdagg/ios-location-spoofer-plus](https://github.com/smthdagg/ios-location-spoofer-plus)
- Version: `0.2.1-plus`

## 核心功能

- Shadowrocket 小火箭 HTTPS 解密与 CA 证书流程
- Cloudflare Worker / Pages 免费部署
- `/admin` 管理后台
- 自动生成 TOKEN
- 自动生成 Shadowrocket `shadowrocket-v2.sgmodule` URL
- 后台内嵌地图定位管理
- OSM、Carto、Esri 卫星、OpenTopo、高德地图、高德卫星底图
- `/health` 诊断接口
- 测试模块：苹果总部、当前 KV 坐标

## 快速开始

1. Cloudflare 上传 Plus zip，或复制单文件 Worker。
2. 绑定 KV：`LOC_KV`。
3. 设置 Secret：`ADMIN`。
4. 打开 `https://你的域名/admin`。
5. 首次点击“生成 TOKEN”。
6. 复制后台生成的小火箭模块 URL 并导入 Shadowrocket。
7. 手机端完成 Shadowrocket HTTPS 解密与 CA 证书信任。
8. 在后台地图点选位置，保存定位。
9. iPhone 定位服务关闭一次再开启。

## 文档

- [完整项目说明书 / Full Project Manual](PROJECT_MANUAL.md)
- [中文小白教程](使用教程.md)
- [Cloudflare 网页部署](location-picker/cloudflare-webui/)
- [Wrangler Worker 部署](location-picker/worker/)

## 截图

![后台概览](docs/assets/admin-dashboard.png)

![地图定位管理](docs/assets/location-map.png)

## 版权与法律说明

Copyright © 2026 SMTH DAGG.

本项目仅供个人研究、测试和合法教育用途。使用者必须自行遵守所在地法律法规、平台条款、运营商规则与第三方服务规则。禁止用于欺诈、骚扰、规避执法、未授权访问或任何违法用途。项目按现状提供，不提供任何担保。

---

## English

Free all-in-one iPhone location management project. Shadowrocket performs HTTPS decryption on the iPhone side, while Cloudflare hosts the Plus admin dashboard for one-time TOKEN generation, Shadowrocket module URL generation, and map-based location management.

![Plus Admin Dashboard](docs/assets/admin-dashboard.png)

## Project Direction

`iOS Location Spoofer Plus` is maintained as an independent Plus branch project. It keeps the upstream JavaScript location spoofing logic and adds a free Cloudflare dashboard for deployment, TOKEN management, module URL generation, map picking, and diagnostics.

Upstream references:

- [acheong08/ios-location-spoofer](https://github.com/acheong08/ios-location-spoofer)
- [mekos2772/ios-location-spoofer](https://github.com/mekos2772/ios-location-spoofer)

Plus edition:

- Developer: **SMTH DAGG**
- Repo: [smthdagg/ios-location-spoofer-plus](https://github.com/smthdagg/ios-location-spoofer-plus)
- Version: `0.2.1-plus`

## Features

- Shadowrocket HTTPS decryption and CA certificate workflow
- Free Cloudflare Worker / Pages deployment
- `/admin` dashboard
- One-time TOKEN generation
- Generated Shadowrocket `shadowrocket-v2.sgmodule` URL
- Built-in map location manager
- OSM, Carto, Esri Satellite, OpenTopo, Amap vector and Amap satellite layers
- `/health` diagnostics
- Diagnostic modules for Apple Park and current KV coordinates

## Quick Start

1. Upload the Plus zip to Cloudflare or paste the single-file Worker.
2. Bind KV as `LOC_KV`.
3. Set Secret `ADMIN`.
4. Open `https://your-domain/admin`.
5. Click “Generate TOKEN” once.
6. Copy the generated Shadowrocket module URL into Shadowrocket.
7. Set up Shadowrocket HTTPS decryption and trust the CA certificate on iPhone.
8. Pick a location on the admin map and save it.
9. Toggle iPhone Location Services off and on.

## Documentation

- [Full Project Manual / 完整项目说明书](PROJECT_MANUAL.md)
- [Chinese Beginner Guide](使用教程.md)
- [Cloudflare Web Deployment](location-picker/cloudflare-webui/)
- [Wrangler Worker Deployment](location-picker/worker/)

## Screenshots

![Admin Overview](docs/assets/admin-dashboard.png)

![Map Location Manager](docs/assets/location-map.png)

## Copyright And Legal Notice

Copyright © 2026 SMTH DAGG.

This project is provided for personal research, testing, and lawful educational use only. You are responsible for complying with local laws, platform terms, carrier policies, and third-party service rules. Do not use it for fraud, harassment, unauthorized access, evasion of enforcement, or any illegal purpose. No warranty is provided.
