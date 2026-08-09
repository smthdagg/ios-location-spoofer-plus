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
  enabled: true,
  latitude: 37.3349,
  longitude: -122.00902,
  altitude: 530,
  horizontalAccuracy: 39,
  verticalAccuracy: 1000,
};

const SPOOFER_SCRIPT_PATH =
  "https://raw.githubusercontent.com/mekos2772/ios-location-spoofer/main/location-spoofer.js";

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
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;margin:0;background:#f6f8fa;color:#1f2328}
main{max-width:960px;margin:0 auto;padding:24px 16px 48px}
.top{display:flex;justify-content:space-between;gap:12px;align-items:center}
h1{font-size:24px;margin:0 0 6px}.muted{color:#656d76}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-top:18px}
.card{background:#fff;border:1px solid #d8dee4;border-radius:10px;padding:16px}
.card h2{font-size:17px;margin:0 0 12px}
input,button{font-size:15px;border-radius:8px}
input{box-sizing:border-box;width:100%;border:1px solid #d0d7de;padding:10px;margin:6px 0 10px}
button{border:0;background:#0969da;color:#fff;padding:10px 13px;font-weight:700;margin:4px 6px 4px 0}
button.secondary{background:#57606a}button.danger{background:#cf222e}
code,.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.url{word-break:break-all;background:#f6f8fa;border:1px solid #d8dee4;border-radius:8px;padding:10px;margin:8px 0}
.ok{color:#1a7f37;font-weight:700}.bad{color:#d1242f;font-weight:700}
</style>
</head>
<body>
<main>
<div class="top">
<div><h1>iOS Location Spoofer Plus</h1><div class="muted">免费 Cloudflare 一站式定位后台：生成 TOKEN、复制模块、直接管理地图定位。</div></div>
<form method="post" action="/admin/logout"><button class="secondary" type="submit">退出</button></form>
</div>
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
<section class="grid">
<div class="card">
<h2>地图地址</h2>
<div id="mapUrl" class="url"></div>
<button data-copy="mapUrl">复制地图地址</button>
</div>
<div class="card">
<h2>小火箭模块</h2>
<div id="srUrl" class="url"></div>
<button data-copy="srUrl">复制模块地址</button>
</div>
<div class="card">
<h2>Loon configUrl</h2>
<div id="loonUrl" class="url"></div>
<button data-copy="loonUrl">复制 configUrl</button>
</div>
</section>
<section class="card" style="margin-top:14px">
<h2>定位管理地图</h2>
<div class="muted" id="mapHint">生成 TOKEN 后，地图会自动加载在这里。必须在地图上点一下或点搜索结果放置图钉，再点“保存定位”。手机定位服务也需要关闭一次再开启。</div>
<iframe id="mapFrame" title="定位管理地图" style="display:none;width:100%;height:680px;border:1px solid #d8dee4;border-radius:8px;margin-top:10px;background:#fff"></iframe>
</section>
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
    'KV：<span class="'+(d.kv?'ok':'bad')+'">'+(d.kv?'正常':'未绑定')+'</span><br>'+
    'TOKEN：<span class="'+(d.tokenConfigured?'ok':'bad')+'">'+(d.tokenConfigured?'已配置':'未生成')+'</span><br>'+
    '当前域名：<span class="mono">'+d.origin+'</span>';
  document.getElementById('loc').textContent =
    d.loc.latitude + ', ' + d.loc.longitude + ' / 海拔 ' + d.loc.altitude + 'm';
  document.getElementById('mapUrl').textContent = d.urls.map;
  document.getElementById('srUrl').textContent = d.urls.shadowrocket;
  document.getElementById('loonUrl').textContent = d.urls.loon;
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
  setTimeout(()=>btn.textContent = btn.dataset.copy === 'srUrl' ? '复制模块地址' : (btn.dataset.copy === 'loonUrl' ? '复制 configUrl' : '复制地图地址'), 900);
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

function moduleResponse(request, token, loc, includeBody = true) {
  const url = new URL(request.url);
  const scriptUrl = `${url.origin}/location-spoofer.js`;
  const altitude = Number.isFinite(Number(loc.altitude)) ? Math.round(Number(loc.altitude)) : 530;
  const horizontalAccuracy = Number.isFinite(Number(loc.horizontalAccuracy)) ? Math.round(Number(loc.horizontalAccuracy)) : 39;
  const verticalAccuracy = Number.isFinite(Number(loc.verticalAccuracy)) ? Math.round(Number(loc.verticalAccuracy)) : 1000;
  return textResponse(
    includeBody ? `#!name=iOS Location Spoofer Plus
#!desc=Apple 定位伪装 Plus。配置已绑定 ${url.origin}，后台保存后小火箭读取 /loc.json 生效。
#!homepage=https://github.com/mekos2772/ios-location-spoofer

[Script]
iOS Location Spoofer Prepare = type=http-request,pattern=^https?:\\/\\/(?:gs-loc(?:-cn)?\\.apple\\.com|bluedot\\.is\\.autonavi\\.com(?:\\.gds\\.alibabadns\\.com)?)\\/clls\\/wloc(?:\\?.*)?$,requires-body=0,timeout=3,script-path=${scriptUrl},argument=debug=false
iOS Location Spoofer = type=http-response,pattern=^https?:\\/\\/(?:gs-loc(?:-cn)?\\.apple\\.com|bluedot\\.is\\.autonavi\\.com(?:\\.gds\\.alibabadns\\.com)?)\\/clls\\/wloc(?:\\?.*)?$,requires-body=1,binary-body-mode=1,max-size=1048576,timeout=10,script-path=${scriptUrl},argument=mode=response&enabled=true&latitude=${loc.latitude}&longitude=${loc.longitude}&horizontalAccuracy=${horizontalAccuracy}&verticalAccuracy=${verticalAccuracy}&altitude=${altitude}&debug=false&configHost=${url.origin}&configToken=${encodeURIComponent(token)}

[MITM]
hostname = %APPEND% gs-loc.apple.com, gs-loc-cn.apple.com, bluedot.is.autonavi.com, bluedot.is.autonavi.com.gds.alibabadns.com
` : "",
    "text/plain; charset=utf-8"
  );
}

function staticModuleResponse(request, loc, name, includeBody = true) {
  const url = new URL(request.url);
  const scriptUrl = `${url.origin}/location-spoofer.js`;
  const altitude = Number.isFinite(Number(loc.altitude)) ? Math.round(Number(loc.altitude)) : 530;
  const horizontalAccuracy = Number.isFinite(Number(loc.horizontalAccuracy)) ? Math.round(Number(loc.horizontalAccuracy)) : 39;
  const verticalAccuracy = Number.isFinite(Number(loc.verticalAccuracy)) ? Math.round(Number(loc.verticalAccuracy)) : 1000;
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
      return jsonResponse({
        ok: true,
        kv: !!env.LOC_KV,
        tokenConfigured: !!token,
        token,
        origin,
        loc,
        urls: {
          map: token ? `${origin}/?token=${encodeURIComponent(token)}` : "",
          loon: token ? `${origin}/loc.json?token=${encodeURIComponent(token)}` : "",
          shadowrocket: token ? `${origin}/shadowrocket-v2.sgmodule?token=${encodeURIComponent(token)}` : "",
        },
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
        cur.enabled = true;
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
        cur.enabled = j.enabled !== false;
        await writeLoc(env, cur);
        return jsonResponse(cur);
      } catch {
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
      return moduleResponse(request, await getAppToken(env), loc, request.method === "GET");
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

    if (url.pathname === "/health") {
      return jsonResponse({ ok: true, kv: !!env.LOC_KV, tokenConfigured: !!(await getAppToken(env)), adminConfigured: !!env.ADMIN });
    }

    return textResponse("not found", "text/plain", 404);
  },
};
