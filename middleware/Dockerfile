FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install --production

COPY . .

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "server.js"]