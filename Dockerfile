# Clearbook Bundle Radar — PAPER public host (aggregator + dashboard)
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps
COPY tsconfig.base.json ./
RUN npm ci
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8787
ENV EXECUTION_MODE=PAPER
ENV ALLOW_LIVE=false
ENV KILL_SWITCH=false
ENV DASHBOARD_DIST=/app/apps/dashboard/dist
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/aggregator ./apps/aggregator
COPY --from=build /app/apps/dashboard/dist ./apps/dashboard/dist
COPY --from=build /app/apps/dashboard/package.json ./apps/dashboard/package.json
EXPOSE 8787
CMD ["npm", "run", "start:aggregator"]
