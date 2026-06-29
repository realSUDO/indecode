FROM node:20-alpine AS base

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
RUN corepack enable pnpm

# Copy everything
COPY . .

# Install dependencies across all workspaces
RUN pnpm install --frozen-lockfile

# Set env vars for build time (fake ones for next build)
ENV NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION="1"

RUN pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Include database migration files
COPY --from=builder --chown=nextjs:nodejs /app/packages/database/migrate.cjs ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/database/drizzle ./drizzle

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
