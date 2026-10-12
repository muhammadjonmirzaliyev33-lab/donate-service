# Bitta image: NestJS backend (bot + API) + Mini App frontend (static). Render uchun.

# ---------- Mini App build ----------
FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- backend build ----------
FROM node:22-alpine AS backend
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# ---------- production ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=backend /app/dist ./dist
COPY backend/docker/postgres/init.sql ./docker/postgres/init.sql
COPY --from=frontend /frontend/dist ./public
CMD ["node", "dist/main.js"]
