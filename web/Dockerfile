# Build stage - just builds the frontend, output will be copied to server container
FROM node:20-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Enable Corepack and prepare Yarn v3
RUN corepack enable && corepack prepare yarn@3.8.4 --activate

# Copy package files and Yarn configuration
COPY package.json yarn.lock* .yarnrc.yml* ./

RUN yarn install --immutable

# Copy source code
COPY . .

# Build the Vite app
RUN yarn build

