FROM node:20-alpine

WORKDIR /app

COPY package.json ./

RUN rm -f package-lock.json && npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]