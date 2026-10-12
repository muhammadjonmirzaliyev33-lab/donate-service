# ---------- build bosqichi ----------
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- production bosqichi ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY docker/postgres/init.sql ./docker/postgres/init.sql

# Render PORT env orqali beradi — main.ts process.env.PORT'ni o'zi o'qiydi.
CMD ["node", "dist/main.js"]
