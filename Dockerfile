# ── Stage 1: Build Angular PWA ────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY angular.json tsconfig.json tsconfig.app.json ./
COPY src ./src

RUN npx ng build --configuration production

# ── Stage 2: Serve with nginx ────────────────────────────
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/www /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
