# Admin panel — production container.
#
# Build:
#   docker build -t better-dash-admin .
# Run (PostgreSQL):
#   docker run -p 8000:8000 \
#     -e DATABASE_URL=postgres://... \
#     -e BETTER_AUTH_SECRET=... \
#     -e BETTER_AUTH_BASE_URL=https://admin.example.com \
#     -e BETTER_AUTH_TRUSTED_ORIGINS=https://app.example.com \
#     -e APP_URL=https://admin.example.com \
#     better-dash-admin
# Run (SQLite — mount a volume for the db file):
#   docker run -p 8000:8000 -v panel-data:/data \
#     -e DB_DRIVER=sqlite -e SQLITE_DB_PATH=/data/admin-panel.db \
#     -e BETTER_AUTH_SECRET=... better-dash-admin

# ---- deps ----
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:24-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime ----
FROM node:24-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
# better-sqlite3 ships prebuilt binaries; keep the full node_modules so the
# native binding matches the runtime image.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.mjs ./server.mjs
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public
EXPOSE 8000
USER node
CMD ["node", "server.mjs"]
