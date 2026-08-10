import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

class MemoryKv {
  constructor() {
    this.values = new Map();
  }

  async get(key) {
    return this.values.get(key) ?? null;
  }

  async put(key, value) {
    this.values.set(key, value);
  }

  async delete(key) {
    this.values.delete(key);
  }
}

async function login(env, origin) {
  const response = await worker.fetch(new Request(`${origin}/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: origin,
    },
    body: new URLSearchParams({ admin: env.ADMIN }),
  }), env);
  assert.equal(response.status, 303);
  return response.headers.get("set-cookie").split(";", 1)[0];
}

test("uses CLIENT_ORIGIN for client URLs while keeping the map on the public site", async () => {
  const publicOrigin = "https://wloc.example.com";
  const clientOrigin = "https://location-worker.example.workers.dev";
  const env = {
    ADMIN: "test-password",
    CLIENT_ORIGIN: clientOrigin,
    LOC_KV: new MemoryKv(),
  };
  await env.LOC_KV.put("settings:token", "1234567890abcdef");
  const cookie = await login(env, publicOrigin);

  const response = await worker.fetch(new Request(`${publicOrigin}/admin/config.json`, {
    headers: { Cookie: cookie },
  }), env);
  const config = await response.json();

  assert.equal(config.origin, publicOrigin);
  assert.equal(config.clientOrigin, clientOrigin);
  assert.match(config.urls.map, new RegExp(`^${publicOrigin.replaceAll(".", "\\.")}/`));
  assert.match(config.urls.shadowrocket, new RegExp(`^${clientOrigin.replaceAll(".", "\\.")}/`));
  assert.match(config.urls.loonConfig, new RegExp(`^${clientOrigin.replaceAll(".", "\\.")}/`));
});

test("generates a focused Shadowrocket WLOC response module", async () => {
  const origin = "https://wloc.example.com";
  const accessCode = "not-a-real-credential-1234";
  const env = { LOC_KV: new MemoryKv() };
  await env.LOC_KV.put("settings:token", accessCode);

  const response = await worker.fetch(new Request(
    `${origin}/shadowrocket-v2.sgmodule?token=${accessCode}`
  ), env);
  const moduleText = await response.text();

  assert.equal(response.status, 200);
  assert.doesNotMatch(moduleText, /type=http-request/);
  assert.doesNotMatch(moduleText, /bluedot|autonavi/);
  assert.match(moduleText, /type=http-response/);
  assert.match(moduleText, /max-size=0/);
  assert.match(moduleText, /timeout=30/);
  assert.match(moduleText, /script-path=https:\/\/raw\.githubusercontent\.com\/mekos2772\/ios-location-spoofer\/main\/location-spoofer\.js/);
  assert.match(moduleText, /configHost=https:\/\/wloc\.example\.com/);
  assert.match(moduleText, /hostname = %APPEND% gs-loc\.apple\.com, gs-loc-cn\.apple\.com/);
});
