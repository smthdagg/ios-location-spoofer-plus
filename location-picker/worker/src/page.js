// 与 location-picker/server.js 的 PAGE 保持一致（地图选点 UI）
export const LANDING_PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="iOS Location Spoofer Plus - 基于 Cloudflare 的一站式 iPhone 定位管理系统">
<title>iOS Location Spoofer Plus</title>
<link rel="preconnect" href="https://unpkg.com">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
:root{--ink:#0d172a;--blue:#0b63f6;--cyan:#08a7c9;--paper:#f6f8fc;--line:#dce4ef;--muted:#607089;--white:#fff}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
a{color:inherit;text-decoration:none}
.hero{position:relative;min-height:760px;height:92vh;overflow:hidden;background:#dce8f2}
#worldMap{position:absolute;inset:0;z-index:0;background:#dce8f2}
.leaflet-control-attribution{font-size:10px!important;background:rgba(255,255,255,.82)!important}
.map-shade{position:absolute;inset:0;z-index:400;pointer-events:none;background:rgba(4,15,35,.38)}
.shell{width:min(1180px,calc(100% - 40px));margin:0 auto}
.nav{position:relative;z-index:500;height:88px;display:flex;align-items:center;justify-content:space-between;color:#fff;border-bottom:1px solid rgba(255,255,255,.24)}
.brand{display:flex;align-items:center;gap:12px;font-weight:800;font-size:17px}.brand-mark{width:42px;height:42px;border-radius:8px;display:grid;place-items:center;background:#fff;color:var(--blue);font-weight:900;font-size:20px;box-shadow:0 8px 22px rgba(0,0,0,.14)}
.nav-right{display:flex;align-items:center;gap:22px;font-size:14px}.nav-link{color:#e8f2ff}.login-small{display:inline-flex;align-items:center;gap:8px;padding:11px 16px;border:1px solid rgba(255,255,255,.66);border-radius:7px;font-weight:700;background:rgba(6,22,47,.28);white-space:nowrap}
.hero-content{position:relative;z-index:500;color:#fff;padding-top:105px;max-width:750px}
.eyebrow{display:inline-flex;align-items:center;gap:9px;padding:7px 11px;border:1px solid rgba(255,255,255,.45);border-radius:999px;background:rgba(9,32,67,.42);font-size:13px;font-weight:700}.live-dot{width:8px;height:8px;border-radius:50%;background:#45e28a;box-shadow:0 0 0 6px rgba(69,226,138,.16)}
h1{font-size:64px;line-height:1.04;margin:23px 0 20px;max-width:740px}.lead{font-size:20px;line-height:1.7;color:#e5effd;max-width:690px;margin:0}
.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:33px}.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 22px;border-radius:7px;font-weight:800}.primary{background:#fff;color:#0b4ec5;box-shadow:0 12px 30px rgba(0,0,0,.2)}.secondary{border:1px solid rgba(255,255,255,.65);color:#fff;background:rgba(5,22,48,.34)}
.metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin-top:56px;width:min(680px,100%);border-top:1px solid rgba(255,255,255,.34);border-bottom:1px solid rgba(255,255,255,.34)}.metric{padding:18px 24px 18px 0}.metric+.metric{padding-left:24px;border-left:1px solid rgba(255,255,255,.3)}.metric strong{display:block;font-size:22px}.metric span{display:block;color:#d9e7f7;font-size:13px;margin-top:5px}
.map-status{position:absolute;z-index:500;right:max(24px,calc((100vw - 1180px)/2));bottom:34px;width:270px;color:#fff;background:rgba(5,20,43,.84);border:1px solid rgba(255,255,255,.28);border-radius:8px;padding:17px;box-shadow:0 14px 35px rgba(0,0,0,.24)}.status-head{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#bcd0e8}.status-city{font-size:20px;font-weight:800;margin:9px 0 3px}.status-coord{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:#c8d8eb}.progress{height:3px;background:rgba(255,255,255,.18);margin-top:14px;overflow:hidden}.progress span{display:block;width:34%;height:100%;background:#34d399;animation:sweep 3.4s linear infinite}@keyframes sweep{from{transform:translateX(-110%)}to{transform:translateX(310%)}}
.section{padding:82px 0}.section-head{display:flex;justify-content:space-between;align-items:end;gap:28px;margin-bottom:34px}.section h2{font-size:38px;margin:0}.section-intro{max-width:590px;color:var(--muted);line-height:1.75;margin:0}
.flow{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line);background:#fff}.flow-item{padding:30px;min-height:225px}.flow-item+.flow-item{border-left:1px solid var(--line)}.step{font:700 12px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--blue)}.flow h3{font-size:21px;margin:42px 0 10px}.flow p{color:var(--muted);line-height:1.7;margin:0}
.clients-band{background:#0d1b32;color:#fff;padding:56px 0}.clients-layout{display:grid;grid-template-columns:1fr 1.45fr;gap:64px;align-items:center}.clients-layout h2{font-size:36px;margin:0 0 13px}.clients-layout p{color:#b9c7da;line-height:1.7;margin:0}.client-list{display:grid;grid-template-columns:repeat(5,1fr);border:1px solid #30425e}.client{padding:20px 9px;text-align:center;font-size:13px;font-weight:700}.client+.client{border-left:1px solid #30425e}.client b{display:grid;place-items:center;width:36px;height:36px;margin:0 auto 10px;border-radius:7px;background:#162d50;color:#63b3ff;font-size:15px}
.about{display:grid;grid-template-columns:1.2fr .8fr;gap:70px;align-items:start}.about h2{font-size:36px;margin:0 0 18px}.about p{color:var(--muted);line-height:1.85;margin:0}.facts{border-top:1px solid var(--line)}.fact{display:flex;justify-content:space-between;gap:24px;padding:16px 0;border-bottom:1px solid var(--line);font-size:14px}.fact span{color:var(--muted)}.fact strong{text-align:right}
footer{border-top:1px solid var(--line);background:#fff}.footer-inner{padding:30px 0;display:flex;justify-content:space-between;gap:30px;color:#67758a;font-size:13px;line-height:1.6}.footer-links{display:flex;gap:20px;flex-wrap:wrap}.footer-links a{color:#244d86}
@media(max-width:820px){.hero{height:auto;min-height:760px}.shell{width:min(100% - 28px,1180px)}.nav{height:72px}.brand{gap:8px;font-size:14px}.brand-mark{width:38px;height:38px}.login-small{padding:10px 12px}.nav-link{display:none}.hero-content{padding-top:70px}.hero h1{font-size:44px}.lead{font-size:17px}.metrics{grid-template-columns:1fr}.metric,.metric+.metric{padding:13px 0;border-left:0;border-top:1px solid rgba(255,255,255,.22)}.metric:first-child{border-top:0}.map-status{display:none}.section{padding:58px 0}.section-head{display:block}.section h2{font-size:31px;margin-bottom:14px}.flow{grid-template-columns:1fr}.flow-item{min-height:0}.flow-item+.flow-item{border-left:0;border-top:1px solid var(--line)}.flow h3{margin-top:24px}.clients-layout,.about{grid-template-columns:1fr;gap:32px}.client-list{grid-template-columns:repeat(2,1fr)}.client+.client{border-left:0}.client:nth-child(even){border-left:1px solid #30425e}.client:nth-child(n+3){border-top:1px solid #30425e}.footer-inner{display:block}.footer-links{margin-top:14px}}
</style>
</head>
<body>
<header class="hero">
  <div id="worldMap" aria-label="动态世界地图演示"></div><div class="map-shade"></div>
  <div class="shell">
    <nav class="nav"><a class="brand" href="/"><span class="brand-mark">LP</span><span>iOS Location Spoofer Plus</span></a><div class="nav-right"><a class="nav-link" href="#workflow">工作流程</a><a class="nav-link" href="#about">项目介绍</a><a class="login-small" href="/admin">登录系统 <span aria-hidden="true">→</span></a></div></nav>
    <div class="hero-content">
      <div class="eyebrow"><span class="live-dot"></span> Cloudflare 一站式定位管理</div>
      <h1>在地图上，管理你的测试位置</h1>
      <p class="lead">自动生成 TOKEN 与代理工具模块，通过 Cloudflare KV 动态保存坐标，在一个清晰、安全的后台中完成部署、选点与调试。</p>
      <div class="actions"><a class="primary" href="/admin">登录系统</a><a class="secondary" href="https://github.com/smthdagg/ios-location-spoofer-plus" rel="noreferrer">查看 GitHub 项目</a></div>
      <div class="metrics"><div class="metric"><strong>5</strong><span>代理工具配置支持</span></div><div class="metric"><strong>6</strong><span>全球与中国地图底图</span></div><div class="metric"><strong>Free</strong><span>基于 Cloudflare 免费服务</span></div></div>
    </div>
  </div>
  <div class="map-status"><div class="status-head"><span>PUBLIC MAP DEMO</span><span>LIVE</span></div><div class="status-city" id="demoCity">Singapore</div><div class="status-coord" id="demoCoord">1.3521, 103.8198</div><div class="progress"><span></span></div></div>
</header>
<main>
  <section class="section shell" id="workflow"><div class="section-head"><h2>从部署到生效，三步完成</h2><p class="section-intro">公开首页仅展示演示地图，不读取或显示你的真实 KV 坐标。所有管理操作都在登录后的私有后台完成。</p></div><div class="flow"><article class="flow-item"><span class="step">01 / DEPLOY</span><h3>部署 Cloudflare</h3><p>上传发行版 zip 或粘贴单文件 Worker，绑定 LOC_KV 并设置 ADMIN 管理密码。</p></article><article class="flow-item"><span class="step">02 / CONNECT</span><h3>连接代理工具</h3><p>登录后台首次生成 TOKEN，复制 Shadowrocket、Surge、Loon、Quantumult X 或 Stash 配置。</p></article><article class="flow-item"><span class="step">03 / LOCATE</span><h3>地图选点生效</h3><p>搜索地点或点击地图放置图钉，保存后关闭再开启一次 iPhone 定位服务。</p></article></div></section>
  <section class="clients-band"><div class="shell clients-layout"><div><h2>一套后台，多种客户端</h2><p>定位数据集中保存在你自己的 Cloudflare KV。日常修改位置无需重新生成 TOKEN，动态客户端也无需反复导入模块。</p></div><div class="client-list"><div class="client"><b>SR</b>Shadowrocket</div><div class="client"><b>SG</b>Surge</div><div class="client"><b>LN</b>Loon</div><div class="client"><b>QX</b>Quantumult X</div><div class="client"><b>ST</b>Stash</div></div></div></section>
  <section class="section shell about" id="about"><div><h2>关于 Plus</h2><p>iOS Location Spoofer Plus 将原项目的 Apple 定位响应修改能力，整合成可独立部署的 Cloudflare 管理系统。它提供后台登录、TOKEN 生命周期、模块 URL、动态坐标接口和多地图选点，同时保持核心脚本来源透明。项目面向个人研究、开发测试与合法教育用途，不提供公共定位账号，也不会在公开首页展示私有坐标。</p></div><div class="facts"><div class="fact"><span>当前版本</span><strong>v1.2.0</strong></div><div class="fact"><span>开发者</span><strong>SMTH DAGG</strong></div><div class="fact"><span>运行平台</span><strong>Cloudflare Workers + KV</strong></div><div class="fact"><span>项目许可</span><strong>MIT License</strong></div></div></section>
</main>
<footer><div class="shell footer-inner"><div>Copyright © 2026 SMTH DAGG. 仅供个人研究、测试与合法教育用途。</div><div class="footer-links"><a href="/admin">登录系统</a><a href="https://github.com/smthdagg/ios-location-spoofer-plus">GitHub</a><a href="https://github.com/mekos2772/ios-location-spoofer">Upstream</a></div></div></footer>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  if(!window.L)return;
  var places=[{name:"Singapore",p:[1.3521,103.8198]},{name:"Hong Kong",p:[22.3193,114.1694]},{name:"London",p:[51.5072,-0.1276]},{name:"New York",p:[40.7128,-74.006]},{name:"San Francisco",p:[37.7749,-122.4194]},{name:"Tokyo",p:[35.6762,139.6503]}];
  var map=L.map("worldMap",{zoomControl:false,attributionControl:true,scrollWheelZoom:false,dragging:false,doubleClickZoom:false,boxZoom:false,keyboard:false,tap:false}).setView([24,20],3);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{subdomains:"abcd",maxZoom:20,attribution:"© OpenStreetMap © CARTO"}).addTo(map);
  var line=L.polyline(places.map(function(x){return x.p;}),{color:"#0b63f6",weight:2,opacity:.55,dashArray:"5 9"}).addTo(map);
  var icon=L.divIcon({className:"",html:'<div style="width:18px;height:18px;border:4px solid white;border-radius:50%;background:#0b63f6;box-shadow:0 0 0 8px rgba(11,99,246,.2),0 5px 16px rgba(0,0,0,.28)"></div>',iconSize:[18,18],iconAnchor:[9,9]});
  var marker=L.marker(places[0].p,{icon:icon}).addTo(map),i=0;
  function next(){i=(i+1)%places.length;var x=places[i];marker.setLatLng(x.p);map.flyTo(x.p,Math.max(map.getZoom(),3),{duration:1.8});document.getElementById("demoCity").textContent=x.name;document.getElementById("demoCoord").textContent=x.p[0].toFixed(4)+", "+x.p[1].toFixed(4);}
  setInterval(next,3400);setTimeout(function(){map.invalidateSize();},200);
})();
</script>
</body>
</html>`;

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
  #restorebtn{padding:11px 16px;font-size:15px;border:0;border-radius:8px;background:#8e8e93;color:#fff}
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
  <button id="restorebtn">恢复真实定位</button>
</div>
<div class="toast" id="toast"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var token = new URLSearchParams(location.search).get("token") || "";

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
  function gcj2wgs(lat,lng){ // 迭代反解，往返误差 <0.001 米
    if(outOfChina(lat,lng))return [lat,lng];
    var wlat=lat, wlng=lng;
    for(var i=0;i<3;i++){ var g=wgs2gcj(wlat,wlng); wlat+=lat-g[0]; wlng+=lng-g[1]; }
    return [wlat,wlng];
  }
  return {wgs2gcj:wgs2gcj, gcj2wgs:gcj2wgs};
})();

var map, marker;
var WGS = {lat:0, lng:0};
var datum = "gcj";
var saved = true;
var enabledState = true;  // true=伪造中；false=已恢复真实定位（脚本放行）

function $(id){return document.getElementById(id);}
function toast(t){var e=$("toast");e.textContent=t;e.classList.add("show");setTimeout(function(){e.classList.remove("show");},1800);}
function numOrNull(id){var v=$(id).value.trim();return v===""?null:Number(v);}
// Leaflet 在重复世界地图上可能返回 -239 这类经度，需要归一化。
function wrapLng(lng){return ((((Number(lng)+180)%360)+360)%360)-180;}

function info(){
  if(!enabledState){
    $("info").innerHTML = "<b style='color:#ff9500'>已恢复真实定位 · 脚本放行不修改</b>　（关开定位后生效）";
    return;
  }
  var tag = saved ? "已保存 ✓" : "未保存 · 点“保存定位”生效";
  $("info").innerHTML = "<b style='color:"+(saved?"#34c759":"#ff9500")+"'>"+tag+"</b>　WGS-84 "+
    WGS.lat.toFixed(5)+", "+WGS.lng.toFixed(5)+"　海拔 "+($("alt").value||"?")+"m";
}

// 切换按钮外观：伪造中(灰按钮“恢复真实定位”) / 已恢复(橙按钮“重新开启伪造”)
function updateEnabledUI(){
  var b=$("restorebtn");
  if(enabledState){ b.textContent="恢复真实定位"; b.style.background="#8e8e93"; }
  else { b.textContent="● 重新开启伪造"; b.style.background="#ff9500"; }
  info();
}

// 一键切换 伪造/恢复真实
function toggleEnabled(){
  var want = !enabledState;
  fetch("/enable?token="+encodeURIComponent(token),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled:want})})
    .then(function(r){
      if(r.ok){ enabledState=want; updateEnabledUI();
        toast(want ? "已开启伪造，记得关开定位生效" : "已恢复真实定位，记得关开定位生效"); }
      else toast("切换失败 "+r.status);
    })
    .catch(function(){ toast("网络错误"); });
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
  fetch("/set?token="+encodeURIComponent(token),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})
    .then(function(r){ if(r.ok){ saved=true; enabledState=true; updateEnabledUI(); toast("已保存 ✓ Loon/小火箭约60秒内生效"); } else { toast("保存失败 "+r.status); } })
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
  fetch("/loc.json?token="+encodeURIComponent(token)).then(function(r){return r.json();}).then(function(d){
    WGS={lat:d.latitude, lng:d.longitude};
    saved=true;
    enabledState=(d.enabled!==false);
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
    updateEnabledUI();

    map.on("baselayerchange",function(e){datum=e.layer.datum||"wgs"; var p=dispPos(); marker.setLatLng(p); map.setView(p,map.getZoom()); info();});
    map.on("click",function(e){movePin(e.latlng.lat,e.latlng.lng);});
    marker.on("dragend",function(){var p=marker.getLatLng(); movePin(p.lat,p.lng);});
  }).catch(function(){$("info").textContent="加载失败，检查 token 是否正确";});
}

$("btn").addEventListener("click",search);
$("q").addEventListener("keydown",function(e){if(e.key==="Enter")search();});
$("savebtn").addEventListener("click",commit);
$("restorebtn").addEventListener("click",toggleEnabled);
load();
</script>
</body>
</html>`;
