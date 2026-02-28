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

# Install a simple HTTP server
RUN npm install -g serve

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Serve the built app
CMD ["serve", "-s", "dist", "-l", "3000"]