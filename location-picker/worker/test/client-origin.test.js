import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const TEST_ACCESS_CODE = "not-a-real-credential-1234";

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
  await env.LOC_KV.put("settings:token", TEST_ACCESS_CODE);
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

test("generates Shadowrocket routing rules for configuration mode", async () => {
  const publicOrigin = "https://wloc.example.com";
  const clientOrigin = "https://location-worker.example.workers.dev";
  const env = {
    ADMIN: "test-password",
    CLIENT_ORIGIN: clientOrigin,
    SHADOWROCKET_POLICY: "Proxy Group",
    LOC_KV: new MemoryKv(),
  };
  await env.LOC_KV.put("settings:token", TEST_ACCESS_CODE);
  const cookie = await login(env, publicOrigin);

  const configResponse = await worker.fetch(new Request(`${publicOrigin}/admin/config.json`, {
    headers: { Cookie: cookie },
  }), env);
  const config = await configResponse.json();
  assert.equal(
    config.routing.shadowrocket,
    "DOMAIN,location-worker.example.workers.dev,Proxy Group"
  );

  const moduleResponse = await worker.fetch(new Request(
    `${clientOrigin}/shadowrocket-v2.sgmodule?token=${TEST_ACCESS_CODE}`
  ), env);
  const moduleText = await moduleResponse.text();
  assert.match(moduleText, /\[Rule\]\nDOMAIN,location-worker\.example\.workers\.dev,Proxy Group/);
});

test("rejects unsafe Shadowrocket policy values", async () => {
  const origin = "https://location-worker.example.workers.dev";
  const env = {
    ADMIN: "test-password",
    SHADOWROCKET_POLICY: "Proxy\nFINAL,DIRECT",
    LOC_KV: new MemoryKv(),
  };
  await env.LOC_KV.put("settings:token", TEST_ACCESS_CODE);
  const cookie = await login(env, origin);

  const configResponse = await worker.fetch(new Request(`${origin}/admin/config.json`, {
    headers: { Cookie: cookie },
  }), env);
  const config = await configResponse.json();
  assert.equal(config.routing.shadowrocket, "");

  const moduleResponse = await worker.fetch(new Request(
    `${origin}/shadowrocket-v2.sgmodule?token=${TEST_ACCESS_CODE}`
  ), env);
  assert.doesNotMatch(await moduleResponse.text(), /\[Rule\]/);
});
