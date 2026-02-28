# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy the server file
COPY server.js .

EXPOSE 3000

# Run the custom proxy server
CMD ["node", "server.js"]