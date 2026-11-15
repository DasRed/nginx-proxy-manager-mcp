FROM node:26-alpine

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /var/www

COPY ./package.json /var/www/package.json
COPY ./package-lock.json /var/www/package-lock.json
COPY ./dist /var/www/dist

RUN npm ci --omit=dev

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget --no-verbose --tries=1 --spider "http://127.0.0.1:${PORT}/healthz" || exit 1

CMD ["node", "dist/index.js"]
