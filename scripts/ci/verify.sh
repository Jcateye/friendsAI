#!/usr/bin/env bash
set -euo pipefail

npm run ci:migration:smoke
npm run ci:server:test
npm run ci:server:e2e
npm run ci:web:build
npm run ci:web:bundle:check
