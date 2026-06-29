FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm
RUN corepack prepare pnpm@9.0.0 --activate
RUN apk update
RUN apk add --no-cache libc6-compat

# --- Stage 1: Prune ---
FROM base AS builder
WORKDIR /app
RUN pnpm add -g turbo
COPY . .
ARG APP_NAME=web
RUN turbo prune @repo/${APP_NAME} --docker

# --- Stage 2: Install ---
FROM base AS installer
WORKDIR /app
# First install dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# --- Stage 3: Build ---
# Build the project and its dependencies
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

# Set env vars for build time
ENV NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION="1"

ARG APP_NAME=web
RUN pnpm turbo run build --filter=@repo/${APP_NAME}...

# --- Stage 4: Runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ARG APP_NAME=web
ENV APP_NAME=${APP_NAME}

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=installer --chown=nextjs:nodejs /app/apps/${APP_NAME}/public ./apps/${APP_NAME}/public

# Automatically leverage output traces to reduce image size
COPY --from=installer --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/static ./apps/${APP_NAME}/.next/static

# Include database migration files (only needed if init-db container is run from this image)
COPY --from=installer --chown=nextjs:nodejs /app/packages/database/migrate.cjs ./
COPY --from=installer --chown=nextjs:nodejs /app/packages/database/drizzle ./drizzle

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "node apps/${APP_NAME}/server.js"]
