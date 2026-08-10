/**
 * iOS Location Spoofer Plus — Cloudflare Worker
 *
 * API（与 location-picker/server.js 兼容）：
 *   GET  /loc.json?token=   → 读取坐标 JSON（Loon configUrl / Shadowrocket v2 模块）
 *   POST /set?token=        → 保存坐标
 *   GET  /?token=           → 地图选点网页（必须带正确 token）
 */

import { PAGE } from "./page.js";

const KV_KEY = "loc";
const TOKEN_KEY = "settings:token";
const SESSION_PREFIX = "admin:session:";
const SESSION_COOKIE = "loc_admin_session";
const SESSION_TTL = 60 * 60 * 24;

const DEFAULT = {
  enabled: true,          // false = 脚本放行原始响应（恢复真实定位）
  latitude: 37.3349,
  longitude: -122.00902,
  altitude: 530,
  horizontalAccuracy: 39,
  verticalAccuracy: 1000,
};

const SPOOFER_SCRIPT_PATH =
  "https://raw.githubusercontent.com/mekos2772/ios-location-spoofer/main/location-spoofer.js";
const QX_SCRIPT_PATH =
  "https://raw.githubusercontent.com/mekos2772/ios-location-spoofer/main/location-spoofer-qx.js";
const APP_VERSION = "1.0.0";
const PROJECT_REPO = "https://github.com/smthdagg/ios-location-spoofer-plus";
const UPSTREAM_REPO = "https://github.com/mekos2772/ios-location-spoofer";
const DEVELOPER_NAME = "SMTH DAGG";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body, status = 200) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...CORS,
    },
  });
}

function textResponse(body, contentType, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      ...CORS,
    },
  });
}

function redirectResponse(location, headers = {}) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function unauthorized(message = "bad token") {
  return jsonResponse({ error: message }, 403);
}

async function getAppToken(env) {
  if (env.LOC_KV) {
    const stored = await env.LOC_KV.get(TOKEN_KEY);
    if (stored) {
      return stored;
    }
  }
  return env.TOKEN || "";
}

async function checkToken(request, env) {
  const configured = await getAppToken(env);
  if (!configured) {
    return { ok: false, error: "server misconfigured: TOKEN not generated" };
  }
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (token !== configured) {
    return { ok: false, error: "bad token" };
  }
  return { ok: true };
}

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const parts = cookie.split(";").map((part) => part.trim());
  const prefix = `${name}=`;
  const found = parts.find((part) => part.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : "";
}

function randomHex(byteLength) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function sameOrigin(request) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) {
    return false;
  }
  const referer = request.headers.get("Referer");
  if (referer) {
    try {
      if (new URL(referer).origin !== url.origin) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}

async function isAdmin(request, env) {
  if (!env.ADMIN || !env.LOC_KV) {
    return false;
  }
  const sid = getCookie(request, SESSION_COOKIE);
  if (!sid || !/^[a-f0-9]{64}$/.test(sid)) {
    return false;
  }
  return (await env.LOC_KV.get(`${SESSION_PREFIX}${sid}`)) === "1";
}

function setupPage(env) {
  return textResponse(`<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>定位后台初始化</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:760px;margin:40px auto;padding:0 18px;line-height:1.7;color:#1f2328}
code{background:#f6f8fa;padding:2px 6px;border-radius:6px}
.bad{color:#d1242f;font-weight:700}.ok{color:#1a7f37;font-weight:700}
li{margin:8px 0}
</style>
</head>
<body>
<h1>还差最后两步</h1>
<p>这个 Worker 已经跑起来了，但后台需要 Cloudflare 先提供两个基础配置。</p>
<ol>
<li>绑定 KV，变量名必须是 <code>LOC_KV</code>：<span class="${env.LOC_KV ? "ok" : "bad"}">${env.LOC_KV ? "已检测到" : "未检测到"}</span></li>
<li>添加管理员密码，变量名必须是 <code>ADMIN</code>：<span class="${env.ADMIN ? "ok" : "bad"}">${env.ADMIN ? "已检测到" : "未检测到"}</span></li>
</ol>
<p>保存配置后，重新部署一次，再打开 <code>/admin</code>。进入后台后首次生成 TOKEN，之后如需更换 TOKEN 可一键重置全部参数。</p>
</body>
</html>`, "text/html; charset=utf-8", 503);
}

function loginPage(error = "") {
  return textResponse(`<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>iOS Location Spoofer Plus 后台登录</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f6f8fa;margin:0;min-height:100vh;display:grid;place-items:center;color:#1f2328}
form{background:#fff;width:min(92vw,380px);padding:28px;border:1px solid #d8dee4;border-radius:10px;box-shadow:0 8px 24px rgba(140,149,159,.18)}
h1{font-size:22px;margin:0 0 18px}
input,button{box-sizing:border-box;width:100%;font-size:16px;border-radius:8px}
input{border:1px solid #d0d7de;padding:12px;margin:8px 0 14px}
button{border:0;background:#0969da;color:#fff;padding:12px;font-weight:700}
.err{color:#d1242f;font-size:14px;min-height:20px}
</style>
</head>
<body>
<form method="post" action="/admin/login">
<h1>iOS Location Spoofer Plus 后台</h1>
<div class="err">${htmlEscape(error)}</div>
<input name="admin" type="password" autocomplete="current-password" placeholder="输入 ADMIN 管理密码" autofocus>
<button type="submit">进入后台</button>
</form>
</body>
</html>`, "text/html; charset=utf-8", error ? 403 : 200);
}

function adminPage() {
  return textResponse(`<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>iOS Location Spoofer Plus 管理后台</title>
<style>
:root{color-scheme:light;--bg:#f4f7fb;--panel:#fff;--line:#dbe3ee;--text:#111827;--muted:#667085;--blue:#0f6bff;--green:#15803d;--red:#dc2626;--soft:#f8fafc}
*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:radial-gradient(circle at top left,#eaf2ff 0,#f6f8fb 38%,#eef2f7 100%);color:var(--text)}
main{max-width:1180px;margin:0 auto;padding:28px 18px 38px}
.hero{background:linear-gradient(135deg,#101828 0%,#1d4ed8 58%,#06b6d4 100%);border-radius:18px;padding:26px;color:#fff;box-shadow:0 18px 45px rgba(15,23,42,.18);display:flex;justify-content:space-between;gap:18px;align-items:flex-start}
.brand{display:flex;gap:14px;align-items:flex-start}.logo{width:48px;height:48px;border-radius:14px;background:rgba(255,255,255,.16);display:grid;place-items:center;font-size:26px;font-weight:900}
h1{font-size:30px;line-height:1.1;margin:0 0 8px}.subtitle{max-width:720px;color:#dbeafe;font-size:16px;line-height:1.55}.hero-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.pill{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.14);color:#fff;border-radius:999px;padding:7px 11px;font-size:13px;font-weight:700}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:18px}.link-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
.card{background:rgba(255,255,255,.92);backdrop-filter:blur(14px);border:1px solid var(--line);border-radius:16px;padding:18px;box-shadow:0 10px 30px rgba(15,23,42,.06)}
.card h2{font-size:18px;margin:0 0 13px;letter-spacing:.01em}.muted{color:var(--muted);line-height:1.55}.small{font-size:13px}
input,button{font-size:15px;border-radius:10px}
input{width:100%;border:1px solid var(--line);padding:11px 12px;margin:5px 0 12px;background:#fff;color:var(--text)}
button{border:0;background:var(--blue);color:#fff;padding:11px 15px;font-weight:800;margin:4px 8px 4px 0;box-shadow:0 8px 18px rgba(15,107,255,.2);cursor:pointer}
button:hover{filter:brightness(.97)}button.secondary{background:#475467;box-shadow:none}button.danger{background:var(--red);box-shadow:0 8px 18px rgba(220,38,38,.2)}
code,.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.url{word-break:break-all;background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:12px;min-height:70px;margin:8px 0 12px;line-height:1.45;color:#1f2937}
.badge{display:inline-flex;align-items:center;border-radius:999px;padding:3px 9px;font-size:13px;font-weight:800;margin:0 4px 6px 0}.badge.ok{background:#dcfce7;color:var(--green)}.badge.bad{background:#fee2e2;color:var(--red)}
.status-line{margin:7px 0}.map-card{margin-top:18px;padding:18px}.map-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:10px}
#mapFrame{display:none;width:100%;height:min(76vh,760px);border:1px solid var(--line);border-radius:14px;background:#fff}
.footer{margin-top:22px;padding:18px;color:#667085;font-size:13px;line-height:1.6}.footer a{color:#175cd3;text-decoration:none;font-weight:700}.legal{margin-top:8px;border-top:1px solid var(--line);padding-top:10px}
@media (max-width:900px){.hero{display:block}.hero-actions{justify-content:flex-start;margin-top:16px}.grid,.link-grid{grid-template-columns:1fr}h1{font-size:25px}main{padding:14px}.map-head{display:block}#mapFrame{height:70vh}}
</style>
</head>
<body>
<main>
<section class="hero">
<div class="brand">
<div class="logo">LP</div>
<div>
<h1>iOS Location Spoofer Plus</h1>
<div class="subtitle">免费 Cloudflare 一站式定位后台：首次生成 TOKEN、复制代理工具模块、直接管理地图定位。</div>
</div>
</div>
<div class="hero-actions">
<span class="pill">Version ${APP_VERSION}</span>
<span class="pill">Developer ${DEVELOPER_NAME}</span>
<form method="post" action="/admin/logout"><button class="secondary" type="submit">退出</button></form>
</div>
</section>
<section class="grid">
<div class="card">
<h2>状态</h2>
<div id="status">加载中...</div>
</div>
<div class="card">
<h2>TOKEN</h2>
<input id="token" class="mono" readonly placeholder="还没有 TOKEN，点下面生成">
<button id="genToken">生成 TOKEN</button>
<button id="resetToken" class="danger" style="display:none">重新生成 TOKEN 并重置所有参数</button>
<div class="muted" id="tokenHint">首次安装时生成一次即可。</div>
</div>
<div class="card">
<h2>当前坐标</h2>
<div id="loc" class="mono">加载中...</div>
</div>
</section>
<section class="grid link-grid">
<div class="card">
<h2>地图地址</h2>
<div id="mapUrl" class="url"></div>
<button data-copy="mapUrl" data-label="复制地图地址">复制地图地址</button>
</div>
<div class="card">
<h2>Shadowrocket 模块</h2>
<div id="srUrl" class="url"></div>
<button data-copy="srUrl" data-label="复制 Shadowrocket">复制 Shadowrocket</button>
</div>
<div class="card">
<h2>Surge 模块</h2>
<div id="surgeUrl" class="url"></div>
<button data-copy="surgeUrl" data-label="复制 Surge">复制 Surge</button>
</div>
<div class="card">
<h2>Loon 插件</h2>
<div id="loonPluginUrl" class="url"></div>
<button data-copy="loonPluginUrl" data-label="复制 Loon 插件">复制 Loon 插件</button>
</div>
<div class="card">
<h2>Quantumult X 片段</h2>
<div id="qxUrl" class="url"></div>
<button data-copy="qxUrl" data-label="复制 QX 片段">复制 QX 片段</button>
<div class="muted small">QX 使用当前坐标静态片段；后台改定位后请重新导入或刷新片段。</div>
</div>
<div class="card">
<h2>Stash 覆写</h2>
<div id="stashUrl" class="url"></div>
<button data-copy="stashUrl" data-label="复制 Stash">复制 Stash</button>
</div>
<div class="card">
<h2>Loon configUrl</h2>
<div id="loonConfigUrl" class="url"></div>
<button data-copy="loonConfigUrl" data-label="复制 configUrl">复制 configUrl</button>
</div>
</section>
<section class="card map-card">
<div class="map-head">
<div>
<h2>定位管理地图</h2>
<div class="muted" id="mapHint">生成 TOKEN 后，地图会自动加载在这里。必须在地图上点一下或点搜索结果放置图钉，再点“保存定位”。手机定位服务也需要关闭一次再开启。</div>
</div>
<span class="pill" style="background:#eef4ff;color:#175cd3;border-color:#c7d7fe">OSM / Carto / Esri / OpenTopo / 高德</span>
</div>
<iframe id="mapFrame" title="定位管理地图"></iframe>
</section>
<footer class="footer card">
<div><strong>iOS Location Spoofer Plus</strong> v${APP_VERSION} · Developer: <strong>${DEVELOPER_NAME}</strong></div>
<div>GitHub: <a href="${PROJECT_REPO}" target="_blank" rel="noreferrer">SMTH DAGG / ios-location-spoofer-plus</a> · Upstream: <a href="${UPSTREAM_REPO}" target="_blank" rel="noreferrer">mekos2772 / ios-location-spoofer</a></div>
<div class="legal">Copyright © 2026 ${DEVELOPER_NAME}. This project is provided for personal research, testing, and lawful educational use only. You are responsible for complying with local laws, platform terms, carrier policies, and third-party service rules. Do not use it for fraud, harassment, unauthorized access, evasion of enforcement, or any illegal purpose. No warranty is provided.</div>
</footer>
</main>
<script>
async function load(){
  const r = await fetch('/admin/config.json');
  if(!r.ok){ document.getElementById('status').textContent='后台会话已失效，请刷新重新登录'; return; }
  const d = await r.json();
  document.getElementById('token').value = d.token || '';
  document.getElementById('genToken').style.display = d.tokenConfigured ? 'none' : 'inline-block';
  document.getElementById('resetToken').style.display = d.tokenConfigured ? 'inline-block' : 'none';
  document.getElementById('tokenHint').textContent = d.tokenConfigured
    ? 'TOKEN 已生成。日常使用不用改；重新生成会让旧模块 URL 失效，并把定位参数恢复默认。'
    : '首次安装时生成一次即可，后台会保存到 KV。';
  document.getElementById('status').innerHTML =
    '<div class="status-line">KV <span class="badge '+(d.kv?'ok':'bad')+'">'+(d.kv?'正常':'未绑定')+'</span></div>'+
    '<div class="status-line">TOKEN <span class="badge '+(d.tokenConfigured?'ok':'bad')+'">'+(d.tokenConfigured?'已配置':'未生成')+'</span></div>'+
    '<div class="status-line small muted">后台域名</div><div class="mono">'+d.origin+'</div>'+
    (d.clientOrigin !== d.origin ? '<div class="status-line small muted">手机数据通道</div><div class="mono">'+d.clientOrigin+'</div>' : '');
  document.getElementById('loc').textContent =
    d.loc.latitude + ', ' + d.loc.longitude + ' / 海拔 ' + d.loc.altitude + 'm';
  document.getElementById('mapUrl').textContent = d.urls.map;
  document.getElementById('srUrl').textContent = d.urls.shadowrocket;
  document.getElementById('surgeUrl').textContent = d.urls.surge;
  document.getElementById('loonPluginUrl').textContent = d.urls.loonPlugin;
  document.getElementById('qxUrl').textContent = d.urls.quantumultx;
  document.getElementById('stashUrl').textContent = d.urls.stash;
  document.getElementById('loonConfigUrl').textContent = d.urls.loonConfig;
  const frame = document.getElementById('mapFrame');
  const hint = document.getElementById('mapHint');
  if(d.urls.map){
    if(frame.src !== d.urls.map) frame.src = d.urls.map;
    frame.style.display = 'block';
    hint.textContent = '地图已接入后台。点地图或搜索结果放置图钉，再点“保存定位”；保存后关闭再开启 iPhone 定位服务。';
  } else {
    frame.style.display = 'none';
    hint.textContent = '生成 TOKEN 后，地图会自动加载在这里。';
  }
}
async function resetToken(confirmReset){
  if(confirmReset && !confirm('将重新生成 TOKEN，并把坐标、海拔、精度恢复默认。旧的小火箭模块 URL 会失效，确定继续？')) return;
  const r = await fetch('/admin/reset-token', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({reset: !!confirmReset})
  });
  const d = await r.json();
  if(!r.ok){ alert(d.error || '操作失败'); return; }
  await load();
}
document.getElementById('genToken').onclick = () => resetToken(false);
document.getElementById('resetToken').onclick = () => resetToken(true);
document.querySelectorAll('[data-copy]').forEach(btn => btn.onclick = async () => {
  const text = document.getElementById(btn.dataset.copy).textContent;
  await navigator.clipboard.writeText(text);
  btn.textContent = '已复制';
  setTimeout(()=>btn.textContent = btn.dataset.label || '复制', 900);
});
load();
</script>
</body>
</html>`, "text/html; charset=utf-8");
}

async function readLoc(env) {
  try {
    const raw = await env.LOC_KV.get(KV_KEY);
    if (!raw) {
      return { ...DEFAULT };
    }
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT };
  }
}

async function writeLoc(env, obj) {
  await env.LOC_KV.put(KV_KEY, JSON.stringify(obj));
}

function setInt(target, key, value) {
  if (value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value))) {
    target[key] = Math.round(Number(value));
  }
}

function wrapLng(lng) {
  return ((((Number(lng) + 180) % 360) + 360) % 360) - 180;
}

function locNumbers(loc) {
  return {
    altitude: Number.isFinite(Number(loc.altitude)) ? Math.round(Number(loc.altitude)) : 530,
    horizontalAccuracy: Number.isFinite(Number(loc.horizontalAccuracy)) ? Math.round(Number(loc.horizontalAccuracy)) : 39,
    verticalAccuracy: Number.isFinite(Number(loc.verticalAccuracy)) ? Math.round(Number(loc.verticalAccuracy)) : 1000,
  };
}

function resolveClientOrigin(env, fallbackOrigin) {
  const configured = String(env.CLIENT_ORIGIN || "").trim().replace(/\/+$/, "");
  if (!configured) return fallbackOrigin;
  try {
    const url = new URL(configured);
    return url.protocol === "https:" ? url.origin : fallbackOrigin;
  } catch {
    return fallbackOrigin;
  }
}

function toolUrls(origin, token, clientOrigin = origin) {
  const encoded = encodeURIComponent(token);
  return {
    map: token ? `${origin}/?token=${encoded}` : "",
    shadowrocket: token ? `${clientOrigin}/shadowrocket-v2.sgmodule?token=${encoded}` : "",
    surge: token ? `${clientOrigin}/surge.sgmodule?token=${encoded}` : "",
    loonPlugin: token ? `${clientOrigin}/loon.lnplugin?token=${encoded}` : "",
    loonConfig: token ? `${clientOrigin}/loc.json?token=${encoded}` : "",
    quantumultx: token ? `${clientOrigin}/quantumultx.snippet?token=${encoded}` : "",
    stash: token ? `${clientOrigin}/stash.stoverride?token=${encoded}` : "",
  };
}

function moduleResponse(request, token, loc, includeBody = true, clientName = "Shadowrocket / Surge") {
  const url = new URL(request.url);
  const scriptUrl = SPOOFER_SCRIPT_PATH;
  const { altitude, horizontalAccuracy, verticalAccuracy } = locNumbers(loc);
  return textResponse(
    includeBody ? `#!name=iOS Location Spoofer Plus
#!desc=Apple 定位伪装 Plus。配置已绑定 ${url.origin}，后台保存后 ${clientName} 读取 /loc.json 生效。
#!homepage=${PROJECT_REPO}

[Script]
iOS Location Spoofer = type=http-response,pattern=^https?:\\/\\/gs-loc(?:-cn)?\\.apple\\.com\\/clls\\/wloc(?:\\?.*)?$,requires-body=1,binary-body-mode=1,max-size=0,timeout=30,script-path=${scriptUrl},argument=mode=response&enabled=true&latitude=${loc.latitude}&longitude=${loc.longitude}&horizontalAccuracy=${horizontalAccuracy}&verticalAccuracy=${verticalAccuracy}&altitude=${altitude}&debug=false&configHost=${url.origin}&configToken=${encodeURIComponent(token)}

[MITM]
hostname = %APPEND% gs-loc.apple.com, gs-loc-cn.apple.com
` : "",
    "text/plain; charset=utf-8"
  );
}

function loonPluginResponse(request, token, loc, includeBody = true) {
  const url = new URL(request.url);
  const scriptUrl = SPOOFER_SCRIPT_PATH;
  const configUrl = `${url.origin}/loc.json?token=${encodeURIComponent(token)}`;
  const { altitude } = locNumbers(loc);
  return textResponse(
    includeBody ? `#!name=iOS Location Spoofer Plus
#!desc=拦截 Apple 定位服务回传坐标并读取 Plus 后台配置。Loon 插件版。
#!homepage=${PROJECT_REPO}

[Argument]
enabled = switch,true,tag=启用定位修改,desc=关闭后脚本直接放行原始定位数据
latitude = input,"${loc.latitude}",tag=纬度(备用),desc=后台配置读取失败时使用
longitude = input,"${loc.longitude}",tag=经度(备用),desc=后台配置读取失败时使用
altitude = input,"${altitude}",tag=海拔(米),desc=后台配置读取失败时使用
address = input,"",tag=地址搜索,desc=可留空，建议直接用 Plus 后台地图管理
configHost = input,"${url.origin}",tag=配置服务器,desc=不要末尾斜杠
configToken = input,"${token}",tag=配置Token,desc=后台自动生成
configUrl = input,"${configUrl}",tag=远程配置URL,desc=与 configHost/configToken 二选一，已自动填入
debug = switch,false,tag=调试日志,desc=排错时开启，日志搜 Location spoofer

[Script]
http-response ^https?:\\/\\/gs-loc(?:-cn)?\\.apple\\.com\\/clls\\/wloc(?:\\?.*)?$ script-path=${scriptUrl}, requires-body=true, binary-body-mode=true, max-size=0, timeout=30, tag=iOS Location Spoofer Plus, argument=[{enabled},{latitude},{longitude},{altitude},{address},{configHost},{configToken},{configUrl},{debug}]
cron "*/5 * * * *" script-path=${scriptUrl}, timeout=30, tag=iOS Location Spoofer Plus Sync, argument=[{address},{configHost},{configToken},{configUrl},{debug}]

[mitm]
hostname = gs-loc.apple.com, gs-loc-cn.apple.com
` : "",
    "text/plain; charset=utf-8"
  );
}

function quantumultXSnippetResponse(request, loc, includeBody = true) {
  const url = new URL(request.url);
  const qxScriptUrl = `${url.origin}/location-spoofer-qx.js`;
  const { altitude, horizontalAccuracy, verticalAccuracy } = locNumbers(loc);
  return textResponse(
    includeBody ? `#!name=iOS Location Spoofer Plus
#!desc=Quantumult X 静态坐标片段：${loc.latitude}, ${loc.longitude}。后台改定位后请重新导入或刷新本片段。
#!homepage=${PROJECT_REPO}

[rewrite_local]
^https?:\\/\\/gs-loc(?:-cn)?\\.apple\\.com\\/clls\\/wloc(?:\\?.*)?$ url script-response-body ${qxScriptUrl}?latitude=${encodeURIComponent(loc.latitude)}&longitude=${encodeURIComponent(loc.longitude)}&horizontalAccuracy=${horizontalAccuracy}&verticalAccuracy=${verticalAccuracy}&altitude=${altitude}&debug=false

[mitm]
hostname = gs-loc.apple.com, gs-loc-cn.apple.com
` : "",
    "text/plain; charset=utf-8"
  );
}

function stashOverrideResponse(request, token, loc, includeBody = true) {
  const url = new URL(request.url);
  const scriptUrl = SPOOFER_SCRIPT_PATH;
  const { altitude, horizontalAccuracy, verticalAccuracy } = locNumbers(loc);
  return textResponse(
    includeBody ? `#!name=iOS Location Spoofer Plus
#!desc=Stash 覆写版。配置已绑定 ${url.origin}，后台保存后读取 /loc.json 生效。
#!homepage=${PROJECT_REPO}

http:
  script:
    - match: '^https?:\\/\\/gs-loc(?:-cn)?\\.apple\\.com\\/clls\\/wloc(?:\\?.*)?$'
      name: ios-location-spoofer-plus
      type: response
      require-body: true
      binary-mode: true
      max-size: 0
      timeout: 30
      argument: 'mode=response&enabled=true&latitude=${loc.latitude}&longitude=${loc.longitude}&horizontalAccuracy=${horizontalAccuracy}&verticalAccuracy=${verticalAccuracy}&altitude=${altitude}&debug=false&configHost=${url.origin}&configToken=${encodeURIComponent(token)}'
  mitm:
    - gs-loc.apple.com
    - gs-loc-cn.apple.com

script-providers:
  ios-location-spoofer-plus:
    url: '${scriptUrl}'
    interval: 86400
` : "",
    "text/yaml; charset=utf-8"
  );
}

function retiredDiagnosticResponse(includeBody = true) {
  return textResponse(
    includeBody
      ? "This diagnostic module was retired in v1.0.0 because it can override the official dynamic module. Delete old test modules and import /shadowrocket-v2.sgmodule from the Plus dashboard.\n"
      : "",
    "text/plain; charset=utf-8",
    410
  );
}

async function scriptResponse(includeBody = true) {
  if (!includeBody) {
    return textResponse("", "application/javascript; charset=utf-8");
  }
  const upstream = await fetch(SPOOFER_SCRIPT_PATH, {
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!upstream.ok) {
    return textResponse("failed to load location-spoofer.js", "text/plain", 502);
  }
  return textResponse(await upstream.text(), "application/javascript; charset=utf-8");
}

function patchQxScript(script, request) {
  const url = new URL(request.url);
  const params = {
    latitude: url.searchParams.get("latitude"),
    longitude: url.searchParams.get("longitude"),
    horizontalAccuracy: url.searchParams.get("horizontalAccuracy"),
    verticalAccuracy: url.searchParams.get("verticalAccuracy"),
    altitude: url.searchParams.get("altitude"),
    debug: url.searchParams.get("debug"),
  };
  const replacements = [];
  if (Number.isFinite(Number(params.latitude))) replacements.push(["latitude", Number(params.latitude)]);
  if (Number.isFinite(Number(params.longitude))) replacements.push(["longitude", Number(params.longitude)]);
  if (Number.isFinite(Number(params.horizontalAccuracy))) replacements.push(["horizontalAccuracy", Math.round(Number(params.horizontalAccuracy))]);
  if (Number.isFinite(Number(params.verticalAccuracy))) replacements.push(["verticalAccuracy", Math.round(Number(params.verticalAccuracy))]);
  if (Number.isFinite(Number(params.altitude))) replacements.push(["altitude", Math.round(Number(params.altitude))]);
  if (params.debug === "true" || params.debug === "false") replacements.push(["debug", params.debug === "true"]);
  let patched = script;
  for (const [key, value] of replacements) {
    const literal = typeof value === "boolean" ? String(value) : String(value);
    patched = patched.replace(new RegExp(`(${key}:\\s*)[-0-9.]+|(${key}:\\s*)(?:true|false)`), `$1$2${literal}`);
  }
  return patched;
}

async function qxScriptResponse(request, includeBody = true) {
  if (!includeBody) {
    return textResponse("", "application/javascript; charset=utf-8");
  }
  const upstream = await fetch(QX_SCRIPT_PATH, {
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!upstream.ok) {
    return textResponse("failed to load location-spoofer-qx.js", "text/plain", 502);
  }
  return textResponse(patchQxScript(await upstream.text(), request), "application/javascript; charset=utf-8");
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/admin" && request.method === "GET") {
      if (!env.LOC_KV || !env.ADMIN) {
        return setupPage(env);
      }
      if (!(await isAdmin(request, env))) {
        return loginPage();
      }
      return adminPage();
    }

    if (url.pathname === "/admin/login" && request.method === "POST") {
      if (!env.LOC_KV || !env.ADMIN) {
        return setupPage(env);
      }
      if (!sameOrigin(request)) {
        return loginPage("请求来源不正确，请从后台页面重新登录");
      }
      const form = await request.formData();
      if (form.get("admin") !== env.ADMIN) {
        return loginPage("管理员密码不正确");
      }
      const sid = randomHex(32);
      await env.LOC_KV.put(`${SESSION_PREFIX}${sid}`, "1", { expirationTtl: SESSION_TTL });
      return redirectResponse("/admin", {
        "Set-Cookie": `${SESSION_COOKIE}=${sid}; Path=/; Max-Age=${SESSION_TTL}; HttpOnly; Secure; SameSite=Lax`,
      });
    }

    if (url.pathname === "/admin/logout" && request.method === "POST") {
      const sid = getCookie(request, SESSION_COOKIE);
      if (env.LOC_KV && sid) {
        await env.LOC_KV.delete(`${SESSION_PREFIX}${sid}`);
      }
      return redirectResponse("/admin", {
        "Set-Cookie": `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
      });
    }

    if (url.pathname === "/admin/config.json" && request.method === "GET") {
      if (!(await isAdmin(request, env))) {
        return unauthorized("admin login required");
      }
      const token = await getAppToken(env);
      const loc = await readLoc(env);
      const origin = url.origin;
      const clientOrigin = resolveClientOrigin(env, origin);
      return jsonResponse({
        ok: true,
        kv: !!env.LOC_KV,
        tokenConfigured: !!token,
        token,
        origin,
        clientOrigin,
        loc,
        urls: toolUrls(origin, token, clientOrigin),
      });
    }

    if ((url.pathname === "/admin/token" || url.pathname === "/admin/reset-token") && request.method === "POST") {
      if (!(await isAdmin(request, env))) {
        return unauthorized("admin login required");
      }
      if (!sameOrigin(request)) {
        return jsonResponse({ error: "bad origin" }, 403);
      }
      try {
        const bodyText = await request.text();
        if (bodyText.length > 10000) {
          return jsonResponse({ error: "payload too large" }, 413);
        }
        const body = bodyText ? JSON.parse(bodyText) : {};
        const token = url.pathname === "/admin/token"
          ? String(body.token || randomHex(24)).trim()
          : randomHex(24);
        if (!/^[A-Za-z0-9._~:-]{16,128}$/.test(token)) {
          return jsonResponse({ error: "TOKEN 必须是 16-128 位，只能包含字母、数字和 . _ ~ : -" }, 400);
        }
        await env.LOC_KV.put(TOKEN_KEY, token);
        if (url.pathname === "/admin/reset-token" && body.reset === true) {
          await writeLoc(env, { ...DEFAULT });
        }
        return jsonResponse({ ok: true, token, reset: url.pathname === "/admin/reset-token" && body.reset === true });
      } catch {
        return jsonResponse({ error: "bad json" }, 400);
      }
    }

    const auth = await checkToken(request, env);

    if (url.pathname === "/loc.json" && request.method === "GET") {
      if (!auth.ok) {
        return unauthorized(auth.error);
      }
      const loc = await readLoc(env);
      return jsonResponse(loc);
    }

    if (url.pathname === "/set" && request.method === "POST") {
      if (!auth.ok) {
        return unauthorized(auth.error);
      }
      let bodyText;
      try {
        bodyText = await request.text();
        if (bodyText.length > 10000) {
          return jsonResponse({ error: "payload too large" }, 413);
        }
        const j = JSON.parse(bodyText);
        const la = Number(j.lat);
        const loRaw = Number(j.lng);
        if (!Number.isFinite(la) || !Number.isFinite(loRaw) || la < -90 || la > 90) {
          return jsonResponse({ error: "bad coords" }, 400);
        }
        const lo = wrapLng(loRaw);
        const cur = await readLoc(env);
        cur.enabled = true; // 保存一个新位置 = 开启伪造
        cur.latitude = la;
        cur.longitude = lo;
        setInt(cur, "altitude", j.altitude);
        setInt(cur, "horizontalAccuracy", j.horizontalAccuracy);
        setInt(cur, "verticalAccuracy", j.verticalAccuracy);
        await writeLoc(env, cur);
        return jsonResponse(cur);
      } catch {
        return jsonResponse({ error: "bad json" }, 400);
      }
    }

    // ---- 一键切换：伪造 / 恢复真实定位 ----
    if (url.pathname === "/enable" && request.method === "POST") {
      if (!auth.ok) {
        return unauthorized(auth.error);
      }
      let bodyText;
      try {
        bodyText = await request.text();
        if (bodyText.length > 10000) {
          return jsonResponse({ error: "payload too large" }, 413);
        }
        const j = JSON.parse(bodyText);
        const cur = await readLoc(env);
        cur.enabled = j.enabled !== false; // false=恢复真实定位（脚本放行）
        await writeLoc(env, cur);
        return jsonResponse(cur);
      } catch (error) {
        return jsonResponse({ error: "bad json" }, 400);
      }
    }

    if ((url.pathname === "/" || url.pathname === "") && request.method === "GET") {
      if (!auth.ok) {
        return unauthorized(auth.error);
      }
      return textResponse(PAGE, "text/html; charset=utf-8");
    }

    if (
      (url.pathname === "/shadowrocket.sgmodule" || url.pathname === "/shadowrocket-v2.sgmodule") &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      if (!auth.ok) {
        return unauthorized(auth.error);
      }
      const loc = await readLoc(env);
      return moduleResponse(request, await getAppToken(env), loc, request.method === "GET", "Shadowrocket");
    }

    if (url.pathname === "/surge.sgmodule" && (request.method === "GET" || request.method === "HEAD")) {
      if (!auth.ok) {
        return unauthorized(auth.error);
      }
      const loc = await readLoc(env);
      return moduleResponse(request, await getAppToken(env), loc, request.method === "GET", "Surge");
    }

    if (url.pathname === "/loon.lnplugin" && (request.method === "GET" || request.method === "HEAD")) {
      if (!auth.ok) {
        return unauthorized(auth.error);
      }
      const loc = await readLoc(env);
      return loonPluginResponse(request, await getAppToken(env), loc, request.method === "GET");
    }

    if (url.pathname === "/quantumultx.snippet" && (request.method === "GET" || request.method === "HEAD")) {
      if (!auth.ok) {
        return unauthorized(auth.error);
      }
      const loc = await readLoc(env);
      return quantumultXSnippetResponse(request, loc, request.method === "GET");
    }

    if (url.pathname === "/stash.stoverride" && (request.method === "GET" || request.method === "HEAD")) {
      if (!auth.ok) {
        return unauthorized(auth.error);
      }
      const loc = await readLoc(env);
      return stashOverrideResponse(request, await getAppToken(env), loc, request.method === "GET");
    }

    if (url.pathname === "/shadowrocket-apple.sgmodule" && (request.method === "GET" || request.method === "HEAD")) {
      return retiredDiagnosticResponse(request.method === "GET");
    }

    if (url.pathname === "/shadowrocket-static.sgmodule" && (request.method === "GET" || request.method === "HEAD")) {
      return retiredDiagnosticResponse(request.method === "GET");
    }

    if (url.pathname === "/location-spoofer.js" && (request.method === "GET" || request.method === "HEAD")) {
      return scriptResponse(request.method === "GET");
    }

    if (url.pathname === "/location-spoofer-qx.js" && (request.method === "GET" || request.method === "HEAD")) {
      return qxScriptResponse(request, request.method === "GET");
    }

    if (url.pathname === "/health") {
      return jsonResponse({ ok: true, kv: !!env.LOC_KV, tokenConfigured: !!(await getAppToken(env)), adminConfigured: !!env.ADMIN });
    }

    return textResponse("not found", "text/plain", 404);
  },
};
