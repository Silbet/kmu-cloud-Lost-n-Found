FROM node:22-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci

FROM node:22-alpine AS backend-build
WORKDIR /app/backend
COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY backend/. .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS web-build
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/. .
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_USE_MOCK=false
ENV VITE_AUTH_HEADER_NAME=Authorization
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json ./
COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/prisma ./prisma
COPY --from=web-build /app/web/dist ./public
RUN mkdir -p uploads
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
