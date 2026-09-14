#!/bin/sh
set -eu
cd "$(dirname "$0")"
node scripts/build.mjs
exec node server/index.mjs
