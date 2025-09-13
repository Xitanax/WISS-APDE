# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm i; fi
COPY . .
RUN npm run build

# --- runtime (nginx) ---
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ ./
# auch statische Assets aus /public (Vite kopiert ohnehin ins dist)
COPY public ./public
