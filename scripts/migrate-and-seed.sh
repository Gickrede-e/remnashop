#!/bin/sh
set -eu

node prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema=prisma/schema.prisma
node prisma/seed.mjs
