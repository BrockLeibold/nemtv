FROM node:22-alpine
WORKDIR /srv
COPY server/server.js server/shim.js ./
COPY app ./public
ENV PORT=8080 DATA=/data
USER node
EXPOSE 8080
CMD ["node","server.js"]
