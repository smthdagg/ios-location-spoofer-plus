# v1.0.0 TDD Evidence

## Regression

The release adds a test requiring both legacy diagnostic endpoints to return HTTP 410 without Apple interception rules or hardcoded Apple Park coordinates.

## Red

Before implementation, the test failed because `/shadowrocket-apple.sgmodule` returned HTTP 200 and an active response interception module.

## Green

After replacing both diagnostic routes with a retirement response, all Worker tests pass. The official `/shadowrocket-v2.sgmodule` test continues to verify one response-only WLOC rule, two Apple MITM hostnames, full binary body handling, a 30-second timeout, the upstream script path, and dynamic `configHost` binding.
