#!/bin/bash
docker run --rm -v $(pwd):/app -w /app node:20-alpine sh -c "
  npm install -g pnpm@9.0.0 turbo
  rm -rf out
  turbo prune @repo/api
  cd out
  pnpm install --frozen-lockfile
  ls -la packages/trpc/node_modules/@repo/auth || echo 'MISSING'
"
