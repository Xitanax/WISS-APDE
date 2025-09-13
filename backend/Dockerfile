FROM node:20-alpine

RUN apk add --no-cache dumb-init curl
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY . .
RUN mkdir -p /app/uploads

ENV NODE_ENV=production
EXPOSE 3000
ENTRYPOINT ["dumb-init","--"]
CMD ["node","src/server.js"]
