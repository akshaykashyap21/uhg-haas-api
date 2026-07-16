# Build: docker build --build-arg SERVICE=auth-service -t auth-service .
ARG SERVICE=auth-service

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY services/auth-service/package.json ./services/auth-service/
COPY services/api-gateway/package.json ./services/api-gateway/
ARG JFROG_NPM_TOKEN
ARG JFROG_NPM_REGISTRY_HOST
ARG JFROG_NPM_VIRTUAL_REPO=npm-virtual
ARG JFROG_NPM_LOCAL_REPO=npm-local
ENV JFROG_NPM_TOKEN=$JFROG_NPM_TOKEN \
    JFROG_NPM_REGISTRY_HOST=$JFROG_NPM_REGISTRY_HOST \
    JFROG_NPM_VIRTUAL_REPO=$JFROG_NPM_VIRTUAL_REPO \
    JFROG_NPM_LOCAL_REPO=$JFROG_NPM_LOCAL_REPO
RUN npm install --workspace=@uhg-haas/shared --workspace=@uhg-haas/${SERVICE} --include-workspace-root

FROM node:20-alpine AS build
ARG SERVICE
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.base.json .npmrc ./
COPY packages/shared ./packages/shared
COPY services/${SERVICE} ./services/${SERVICE}
RUN npm run build -w @uhg-haas/shared && npm run build -w @uhg-haas/${SERVICE}

FROM node:20-alpine AS runner
ARG SERVICE
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/services/${SERVICE}/package.json ./services/${SERVICE}/package.json
COPY --from=build /app/services/${SERVICE}/dist ./services/${SERVICE}/dist
WORKDIR /app/services/${SERVICE}
USER node
CMD ["node", "dist/server.js"]
