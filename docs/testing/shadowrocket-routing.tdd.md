# Shadowrocket Configuration-Mode Routing Evidence

## User journey

As a Shadowrocket user, I want Plus module updates and dynamic `/loc.json` reads to use my proxy policy in configuration mode, so that I do not need global proxy mode.

## RED and GREEN

- RED: `npm test` failed because `/admin/config.json` had no `routing.shadowrocket` value.
- GREEN: the same test passed after adding validated `SHADOWROCKET_POLICY` handling and generated module rules.

## Guarantees

| What is guaranteed | Test | Result |
|---|---|---|
| `CLIENT_ORIGIN` keeps the map on the public domain while client URLs use the reachable Worker endpoint | `test/client-origin.test.js` | PASS |
| The dashboard generates an exact Shadowrocket domain rule from `SHADOWROCKET_POLICY` | `test/client-origin.test.js` | PASS |
| The generated Shadowrocket module contains the same `[Rule]` entry | `test/client-origin.test.js` | PASS |
| Commas and line breaks cannot inject extra Shadowrocket rules through the policy variable | `test/client-origin.test.js` | PASS |

Validation command: `npm test` in `location-picker/worker`.

## Known gap

No desktop test can emulate a specific carrier or Passwall route. Device validation must confirm that the rule is placed before remote rule sets, `GEOIP`, and `FINAL` in the active Shadowrocket configuration.
