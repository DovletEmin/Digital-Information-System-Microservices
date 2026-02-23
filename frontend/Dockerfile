# ---------- deps ----------
FROM node:18-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./

# 🔥 защита от плохой сети
RUN npm config set registry https://registry.npmmirror.com \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 600000 \
    && npm config set fetch-timeout 600000 \
    && npm ci --prefer-offline --no-audit

# ---------- builder ----------
FROM node:18-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ---------- runner ----------
FROM node:18-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

# 🔥 уменьшаем размер образа
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3002

CMD ["node", "server.js"]
