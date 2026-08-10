// 与 location-picker/server.js 的 PAGE 保持一致（地图选点 UI）
export const PAGE = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>定位选点</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
  html,body{margin:0;height:100%;font-family:-apple-system,BlinkMacSystemFont,sans-serif}
  .bar{padding:8px;display:flex;gap:6px;box-sizing:border-box}
  .bar input{flex:1;padding:10px;font-size:16px;border:1px solid #ccc;border-radius:8px}
  .bar button{padding:10px 14px;font-size:16px;border:0;border-radius:8px;background:#007aff;color:#fff}
  .results{margin:0 8px;border:1px solid #e2e2e2;border-radius:8px;max-height:34vh;overflow:auto;display:none}
  .results.show{display:block}
  .rrow{padding:10px 12px;font-size:14px;border-bottom:1px solid #eee;color:#222}
  .rrow:last-child{border-bottom:0}
  .rrow:active{background:#f0f6ff}
  #map{height:52vh}
  #info{padding:8px 10px;font-size:13px;line-height:1.4}
  .hint{padding:6px 10px 0;font-size:12px;line-height:1.45;color:#666}
  .opts{padding:6px 10px 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}
  .opts label{font-size:13px;color:#444;display:flex;flex-direction:column}
  .opts input{width:88px;padding:8px;font-size:15px;border:1px solid #ccc;border-radius:6px;margin-top:2px}
  #savebtn{padding:11px 20px;font-size:16px;border:0;border-radius:8px;background:#34c759;color:#fff;font-weight:600}
  .toast{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);
    background:rgba(0,0,0,.85);color:#fff;padding:10px 16px;border-radius:8px;
    font-size:14px;opacity:0;transition:opacity .3s;pointer-events:none;z-index:9999}
  .toast.show{opacity:1}
</style>
</head>
<body>
<div class="bar">
  <input id="q" placeholder="搜地名，回车列出候选（只预览，不改定位）">
  <button id="btn">搜</button>
</div>
<div class="results" id="results"></div>
<div id="map"></div>
<div class="hint">提醒：必须在地图上点一下或点搜索结果放置图钉，再点“保存定位”才会写入定位数据。保存后，手机定位服务需要关闭一次再开启才会生效。</div>
<div id="info">加载中…</div>
<div class="opts">
  <label>海拔(米)<input id="alt" type="number" inputmode="numeric"></label>
  <label>水平精度<input id="hacc" type="number" inputmode="numeric"></label>
  <label>垂直精度<input id="vacc" type="number" inputmode="numeric"></label>
  <button id="savebtn">保存定位</button>
</div>
<div class="toast" id="toast"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var token = new URLSearchParams(location.search).get("token") || "";
var authQuery = "?tok" + "en=";

var GCJ = (function(){
  var PI = Math.PI, a = 6378245.0, ee = 0.00669342162296594323;
  function outOfChina(lat,lng){return (lng<72.004||lng>137.8347)||(lat<0.8293||lat>55.8271);}
  function tLat(x,y){
    var r=-100.0+2.0*x+3.0*y+0.2*y*y+0.1*x*y+0.2*Math.sqrt(Math.abs(x));
    r+=(20.0*Math.sin(6.0*x*PI)+20.0*Math.sin(2.0*x*PI))*2.0/3.0;
    r+=(20.0*Math.sin(y*PI)+40.0*Math.sin(y/3.0*PI))*2.0/3.0;
    r+=(160.0*Math.sin(y/12.0*PI)+320*Math.sin(y*PI/30.0))*2.0/3.0;return r;
  }
  function tLng(x,y){
    var r=300.0+x+2.0*y+0.1*x*x+0.1*x*y+0.1*Math.sqrt(Math.abs(x));
    r+=(20.0*Math.sin(6.0*x*PI)+20.0*Math.sin(2.0*x*PI))*2.0/3.0;
    r+=(20.0*Math.sin(x*PI)+40.0*Math.sin(x/3.0*PI))*2.0/3.0;
    r+=(150.0*Math.sin(x/12.0*PI)+300*Math.sin(x/30.0*PI))*2.0/3.0;return r;
  }
  function wgs2gcj(lat,lng){
    if(outOfChina(lat,lng))return [lat,lng];
    var dLat=tLat(lng-105.0,lat-35.0), dLng=tLng(lng-105.0,lat-35.0);
    var radLat=lat/180.0*PI, m=Math.sin(radLat); m=1-ee*m*m; var sm=Math.sqrt(m);
    dLat=(dLat*180.0)/((a*(1-ee))/(m*sm)*PI);
    dLng=(dLng*180.0)/(a/sm*Math.cos(radLat)*PI);
    return [lat+dLat,lng+dLng];
  }
  function gcj2wgs(lat,lng){
    if(outOfChina(lat,lng))return [lat,lng];
    var g=wgs2gcj(lat,lng); return [lat*2-g[0], lng*2-g[1]];
  }
  return {wgs2gcj:wgs2gcj, gcj2wgs:gcj2wgs};
})();

var map, marker;
var WGS = {lat:0, lng:0};
var datum = "gcj";
var saved = true;

function $(id){return document.getElementById(id);}
function toast(t){var e=$("toast");e.textContent=t;e.classList.add("show");setTimeout(function(){e.classList.remove("show");},1800);}
function numOrNull(id){var v=$(id).value.trim();return v===""?null:Number(v);}
// Leaflet 在重复世界地图上可能返回 -239 这类经度，需要归一化。
function wrapLng(lng){return ((((Number(lng)+180)%360)+360)%360)-180;}

function info(){
  var tag = saved ? "已保存 ✓" : "未保存 · 点“保存定位”生效";
  $("info").innerHTML = "<b style='color:"+(saved?"#34c759":"#ff9500")+"'>"+tag+"</b>　WGS-84 "+
    WGS.lat.toFixed(5)+", "+WGS.lng.toFixed(5)+"　海拔 "+($("alt").value||"?")+"m";
}

function dispPos(){return datum==="gcj"?GCJ.wgs2gcj(WGS.lat,WGS.lng):[WGS.lat,WGS.lng];}
function toWgs(lat,lng){lng=wrapLng(lng);return datum==="gcj"?GCJ.gcj2wgs(lat,lng):[lat,lng];}

function fetchElevation(lat,lng){
  lng=wrapLng(lng);
  return fetch("https://api.open-meteo.com/v1/elevation?latitude="+lat+"&longitude="+lng)
    .then(function(r){return r.json();})
    .then(function(d){return (d&&d.elevation&&d.elevation.length)?d.elevation[0]:null;})
    .catch(function(){return null;});
}

function movePin(dispLat,dispLng){
  dispLng=wrapLng(dispLng);
  var w=toWgs(dispLat,dispLng);
  WGS={lat:w[0], lng:wrapLng(w[1])};
  saved=false;
  marker.setLatLng([dispLat,dispLng]);
  info();
  fetchElevation(WGS.lat,WGS.lng).then(function(el){ if(el!==null)$("alt").value=Math.round(el); info(); });
}

function commit(){
  var payload={lat:WGS.lat, lng:WGS.lng,
    altitude:numOrNull("alt"), horizontalAccuracy:numOrNull("hacc"), verticalAccuracy:numOrNull("vacc")};
  fetch("/set"+authQuery+encodeURIComponent(token),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})
    .then(function(r){ if(r.ok){ saved=true; info(); toast("已保存 ✓ Loon/小火箭约60秒内生效"); } else { toast("保存失败 "+r.status); } })
    .catch(function(){ toast("网络错误"); });
}

function search(){
  var q=$("q").value.trim(); if(!q) return;
  fetch("https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=8&q="+encodeURIComponent(q))
    .then(function(r){return r.json();})
    .then(function(a){
      var box=$("results"); box.innerHTML="";
      if(!a||!a.length){ box.classList.remove("show"); toast("没找到"); return; }
      a.forEach(function(it){
        var row=document.createElement("div");
        row.className="rrow";
        row.textContent=it.display_name;
        row.addEventListener("click",function(){
          box.classList.remove("show"); box.innerHTML="";
          var la=+it.lat, lo=+it.lon;
          var p = datum==="gcj"?GCJ.wgs2gcj(la,lo):[la,lo];
          map.setView(p,15);
          movePin(p[0],p[1]);
          toast("已放置图钉，点“保存定位”生效");
        });
        box.appendChild(row);
      });
      box.classList.add("show");
    })
    .catch(function(){toast("搜索失败");});
}

function load(){
  fetch("/loc.json"+authQuery+encodeURIComponent(token)).then(function(r){return r.json();}).then(function(d){
    WGS={lat:d.latitude, lng:d.longitude};
    saved=true;
    $("alt").value=(d.altitude!==undefined?d.altitude:"");
    $("hacc").value=(d.horizontalAccuracy!==undefined?d.horizontalAccuracy:39);
    $("vacc").value=(d.verticalAccuracy!==undefined?d.verticalAccuracy:1000);

    var amapVec=L.tileLayer("https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7",{subdomains:"1234",maxZoom:18,attribution:"高德地图"});
    amapVec.datum="gcj";
    var amapSatBase=L.tileLayer("https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",{subdomains:"1234",maxZoom:18});
    var amapSatLabel=L.tileLayer("https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=8",{subdomains:"1234",maxZoom:18});
    var amapSat=L.layerGroup([amapSatBase,amapSatLabel]);
    amapSat.datum="gcj";
    var osm=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"});
    osm.datum="wgs";
    var carto=L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{subdomains:"abcd",maxZoom:20,attribution:"© OpenStreetMap © CARTO"});
    carto.datum="wgs";
    var esriSat=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"Tiles © Esri"});
    esriSat.datum="wgs";
    var topo=L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",{subdomains:"abc",maxZoom:17,attribution:"© OpenTopoMap"});
    topo.datum="wgs";

    function fallbackToOsm(){
      if(!map || datum==="wgs") return;
      if(map.hasLayer(amapVec)) map.removeLayer(amapVec);
      if(map.hasLayer(amapSat)) map.removeLayer(amapSat);
      if(!map.hasLayer(osm)) osm.addTo(map);
      datum="wgs";
      var p=dispPos();
      if(marker) marker.setLatLng(p);
      map.setView(p,map.getZoom());
      info();
      toast("高德底图加载失败，已切换 OSM");
    }
    amapVec.on("tileerror",fallbackToOsm);
    amapSatBase.on("tileerror",fallbackToOsm);
    amapSatLabel.on("tileerror",fallbackToOsm);

    map=L.map("map");
    osm.addTo(map); datum="wgs";
    map.setView(dispPos(),13);
    L.control.layers({"OSM 地图":osm,"Carto 浅色":carto,"Esri 卫星":esriSat,"OpenTopo 地形":topo,"高德地图":amapVec,"高德卫星":amapSat},null,{collapsed:false}).addTo(map);

    marker=L.marker(dispPos(),{draggable:true}).addTo(map);
    info();

    map.on("baselayerchange",function(e){datum=e.layer.datum||"wgs"; var p=dispPos(); marker.setLatLng(p); map.setView(p,map.getZoom()); info();});
    map.on("click",function(e){movePin(e.latlng.lat,e.latlng.lng);});
    marker.on("dragend",function(){var p=marker.getLatLng(); movePin(p.lat,p.lng);});
  }).catch(function(){$("info").textContent="加载失败，检查 token 是否正确";});
}

$("btn").addEventListener("click",search);
$("q").addEventListener("keydown",function(e){if(e.key==="Enter")search();});
$("savebtn").addEventListener("click",commit);
load();
</script>
</body>
</html>`;

/**
 * iOS Location Spoofer Plus — Cloudflare Worker
 *
 * API（与 location-picker/server.js 兼容）：
 *   GET  /loc.json?token=   → 读取坐标 JSON（Loon configUrl / Shadowrocket v2 模块）
 *   POST /set?token=        → 保存坐标
 *   GET  /?token=           → 地图选点网页（必须带正确 token）
 */


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
const APP_VERSION = "0.2.4-plus";
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
<h2>Shadowrocket 配置模式规则</h2>
<div id="routingRule" class="url"></div>
<button data-copy="routingRule" data-label="复制分流规则">复制分流规则</button>
<div class="muted small">放在远程规则集、GEOIP 和 FINAL 之前。全局能访问而配置模式不能访问时，必须让数据域名走代理。</div>
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
  document.getElementById('routingRule').textContent = d.routing.shadowrocket || '未设置 SHADOWROCKET_POLICY；请在 Worker 变量中填写你的代理策略组名称。';
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

function shadowrocketPolicy(env) {
  const policy = String(env.SHADOWROCKET_POLICY || "").trim();
  return policy && policy.length <= 64 && !/[,\r\n]/.test(policy) ? policy : "";
}

function shadowrocketRoutingRule(origin, policy) {
  if (!policy) return "";
  return `DOMAIN,${new URL(origin).hostname},${policy}`;
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

function moduleResponse(request, token, loc, includeBody = true, clientName = "Shadowrocket / Surge", routingPolicy = "") {
  const url = new URL(request.url);
  const scriptUrl = `${url.origin}/location-spoofer.js`;
  const { altitude, horizontalAccuracy, verticalAccuracy } = locNumbers(loc);
  const routingSection = routingPolicy
    ? `\n[Rule]\n${shadowrocketRoutingRule(url.origin, routingPolicy)}\n`
    : "";
  return textResponse(
    includeBody ? `#!name=iOS Location Spoofer Plus
#!desc=Apple 定位伪装 Plus。配置已绑定 ${url.origin}，后台保存后 ${clientName} 读取 /loc.json 生效。
#!homepage=${PROJECT_REPO}

[Script]
iOS Location Spoofer Prepare = type=http-request,pattern=^https?:\\/\\/(?:gs-loc(?:-cn)?\\.apple\\.com|bluedot\\.is\\.autonavi\\.com(?:\\.gds\\.alibabadns\\.com)?)\\/clls\\/wloc(?:\\?.*)?$,requires-body=0,timeout=3,script-path=${scriptUrl},argument=debug=false
iOS Location Spoofer = type=http-response,pattern=^https?:\\/\\/(?:gs-loc(?:-cn)?\\.apple\\.com|bluedot\\.is\\.autonavi\\.com(?:\\.gds\\.alibabadns\\.com)?)\\/clls\\/wloc(?:\\?.*)?$,requires-body=1,binary-body-mode=1,max-size=1048576,timeout=10,script-path=${scriptUrl},argument=mode=response&enabled=true&latitude=${loc.latitude}&longitude=${loc.longitude}&horizontalAccuracy=${horizontalAccuracy}&verticalAccuracy=${verticalAccuracy}&altitude=${altitude}&debug=false&configHost=${url.origin}&configToken=${encodeURIComponent(token)}
${routingSection}
[MITM]
hostname = %APPEND% gs-loc.apple.com, gs-loc-cn.apple.com, bluedot.is.autonavi.com, bluedot.is.autonavi.com.gds.alibabadns.com
` : "",
    "text/plain; charset=utf-8"
  );
}

function loonPluginResponse(request, token, loc, includeBody = true) {
  const url = new URL(request.url);
  const scriptUrl = `${url.origin}/location-spoofer.js`;
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
http-request ^https?:\\/\\/(?:gs-loc(?:-cn)?\\.apple\\.com|bluedot\\.is\\.autonavi\\.com(?:\\.gds\\.alibabadns\\.com)?)\\/clls\\/wloc(?:\\?.*)?$ script-path=${scriptUrl}, requires-body=false, timeout=3, tag=iOS Location Spoofer Plus Prepare, argument=[{debug}]
http-response ^https?:\\/\\/(?:gs-loc(?:-cn)?\\.apple\\.com|bluedot\\.is\\.autonavi\\.com(?:\\.gds\\.alibabadns\\.com)?)\\/clls\\/wloc(?:\\?.*)?$ script-path=${scriptUrl}, requires-body=true, binary-body-mode=true, max-size=1048576, timeout=12, tag=iOS Location Spoofer Plus, argument=[{enabled},{latitude},{longitude},{altitude},{address},{configHost},{configToken},{configUrl},{debug}]
cron "*/5 * * * *" script-path=${scriptUrl}, timeout=30, tag=iOS Location Spoofer Plus Sync, argument=[{address},{configHost},{configToken},{configUrl},{debug}]

[mitm]
hostname = gs-loc.apple.com, gs-loc-cn.apple.com, bluedot.is.autonavi.com, bluedot.is.autonavi.com.gds.alibabadns.com
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
^https?:\\/\\/(?:gs-loc(?:-cn)?\\.apple\\.com|bluedot\\.is\\.autonavi\\.com(?:\\.gds\\.alibabadns\\.com)?)\\/clls\\/wloc(?:\\?.*)?$ url script-response-body ${qxScriptUrl}?latitude=${encodeURIComponent(loc.latitude)}&longitude=${encodeURIComponent(loc.longitude)}&horizontalAccuracy=${horizontalAccuracy}&verticalAccuracy=${verticalAccuracy}&altitude=${altitude}&debug=false

[mitm]
hostname = gs-loc.apple.com, gs-loc-cn.apple.com, bluedot.is.autonavi.com, bluedot.is.autonavi.com.gds.alibabadns.com
` : "",
    "text/plain; charset=utf-8"
  );
}

function stashOverrideResponse(request, token, loc, includeBody = true) {
  const url = new URL(request.url);
  const scriptUrl = `${url.origin}/location-spoofer.js`;
  const { altitude, horizontalAccuracy, verticalAccuracy } = locNumbers(loc);
  return textResponse(
    includeBody ? `#!name=iOS Location Spoofer Plus
#!desc=Stash 覆写版。配置已绑定 ${url.origin}，后台保存后读取 /loc.json 生效。
#!homepage=${PROJECT_REPO}

http:
  script:
    - match: '^https?:\\/\\/(?:gs-loc(?:-cn)?\\.apple\\.com|bluedot\\.is\\.autonavi\\.com(?:\\.gds\\.alibabadns\\.com)?)\\/clls\\/wloc(?:\\?.*)?$'
      name: ios-location-spoofer-plus
      type: response
      require-body: true
      binary-mode: true
      max-size: 1048576
      timeout: 10
      argument: 'mode=response&enabled=true&latitude=${loc.latitude}&longitude=${loc.longitude}&horizontalAccuracy=${horizontalAccuracy}&verticalAccuracy=${verticalAccuracy}&altitude=${altitude}&debug=false&configHost=${url.origin}&configToken=${encodeURIComponent(token)}'
  mitm:
    - gs-loc.apple.com
    - gs-loc-cn.apple.com
    - bluedot.is.autonavi.com
    - bluedot.is.autonavi.com.gds.alibabadns.com

script-providers:
  ios-location-spoofer-plus:
    url: '${scriptUrl}'
    interval: 86400
` : "",
    "text/yaml; charset=utf-8"
  );
}

function staticModuleResponse(request, loc, name, includeBody = true) {
  const url = new URL(request.url);
  const scriptUrl = `${url.origin}/location-spoofer.js`;
  const { altitude, horizontalAccuracy, verticalAccuracy } = locNumbers(loc);
  return textResponse(
    includeBody ? `#!name=${name}
#!desc=诊断用：硬编码坐标，不读取 /loc.json。用于确认 Shadowrocket 模块和 MITM 是否真的生效。
#!homepage=https://github.com/mekos2772/ios-location-spoofer

[Script]
iOS Location Spoofer Prepare = type=http-request,pattern=^https?:\\/\\/(?:gs-loc(?:-cn)?\\.apple\\.com|bluedot\\.is\\.autonavi\\.com(?:\\.gds\\.alibabadns\\.com)?)\\/clls\\/wloc(?:\\?.*)?$,requires-body=0,timeout=3,script-path=${scriptUrl},argument=debug=true
iOS Location Spoofer = type=http-response,pattern=^https?:\\/\\/(?:gs-loc(?:-cn)?\\.apple\\.com|bluedot\\.is\\.autonavi\\.com(?:\\.gds\\.alibabadns\\.com)?)\\/clls\\/wloc(?:\\?.*)?$,requires-body=1,binary-body-mode=1,max-size=1048576,timeout=10,script-path=${scriptUrl},argument=mode=response&enabled=true&latitude=${loc.latitude}&longitude=${loc.longitude}&horizontalAccuracy=${horizontalAccuracy}&verticalAccuracy=${verticalAccuracy}&altitude=${altitude}&debug=true

[MITM]
hostname = %APPEND% gs-loc.apple.com, gs-loc-cn.apple.com, bluedot.is.autonavi.com, bluedot.is.autonavi.com.gds.alibabadns.com
` : "",
    "text/plain; charset=utf-8"
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
      const routingPolicy = shadowrocketPolicy(env);
      return jsonResponse({
        ok: true,
        kv: !!env.LOC_KV,
        tokenConfigured: !!token,
        token,
        origin,
        clientOrigin,
        loc,
        routing: {
          shadowrocket: shadowrocketRoutingRule(clientOrigin, routingPolicy),
        },
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
      return moduleResponse(request, await getAppToken(env), loc, request.method === "GET", "Shadowrocket", shadowrocketPolicy(env));
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
      if (!auth.ok) {
        return unauthorized(auth.error);
      }
      return staticModuleResponse(request, DEFAULT, "iOS Location Spoofer Plus Apple Test", request.method === "GET");
    }

    if (url.pathname === "/shadowrocket-static.sgmodule" && (request.method === "GET" || request.method === "HEAD")) {
      if (!auth.ok) {
        return unauthorized(auth.error);
      }
      const loc = await readLoc(env);
      return staticModuleResponse(request, loc, "iOS Location Spoofer Plus Static Test", request.method === "GET");
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
