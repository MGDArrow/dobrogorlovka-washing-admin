# Dockerfile
FROM node:24-alpine AS builder

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./
RUN npm ci

# Копируем исходный код и собираем приложение
COPY . .
RUN npm run build

# Финальный образ
FROM node:24-alpine

# Устанавливаем Chromium и зависимости для работы без GUI
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*


WORKDIR /app

# Копируем только необходимые файлы из стадии builder
COPY --from=builder /app/.output ./.output
# COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/package.json ./package.json

# Указываем переменные окружения
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]


