# Build stage
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

# Build the Next.js app
RUN yarn build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Enable Corepack for Yarn v3
RUN corepack enable && corepack prepare yarn@3.8.4 --activate

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Create .yarn directory with proper permissions for Yarn v3
RUN mkdir -p /app/.yarn && chown -R nextjs:nodejs /app/.yarn

# Copy package files for reference
COPY package.json yarn.lock* ./

# Copy node_modules and built application from builder
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./
COPY --from=builder --chown=nextjs:nodejs /app/src ./src

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["yarn", "start"]

