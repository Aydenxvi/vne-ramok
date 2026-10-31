FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node . .
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
ENV HOST=0.0.0.0 PORT=3000 PUBLIC_DEMO=1 COOKIE_SECURE=1 NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
