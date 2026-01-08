# Stage 1: Build frontend with Node.js
FROM node:20 AS frontend-builder

WORKDIR /web-build

# Copy frontend package files
COPY web/package.json web/yarn.lock web/.yarnrc.yml ./

# Install frontend dependencies
RUN corepack enable && corepack prepare yarn@3.8.4 --activate && \
    yarn install --immutable

# Copy frontend source code
COPY web/ .

# Create the output directory structure
RUN mkdir -p ../server/static

# Build the frontend (vite.config.ts is configured to output to ../server/static)
RUN yarn build

# Stage 2: Python runtime
FROM python:3.11
LABEL authors="pat dill"

ARG TARGETARCH
ARG S6_OVERLAY_VERSION=3.2.0.0

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ffmpeg \
    libportaudio2 \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Install s6-overlay for process supervision
RUN case "${TARGETARCH}" in \
    "amd64") S6_ARCH="x86_64" ;; \
    "arm64") S6_ARCH="aarch64" ;; \
    *) echo "Unsupported architecture: ${TARGETARCH}" && exit 1 ;; \
    esac && \
    curl -L -o /tmp/s6-overlay-noarch.tar.xz https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz && \
    curl -L -o /tmp/s6-overlay.tar.xz https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${S6_ARCH}.tar.xz && \
    tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz && \
    tar -C / -Jxpf /tmp/s6-overlay.tar.xz && \
    rm /tmp/s6-overlay-noarch.tar.xz /tmp/s6-overlay.tar.xz

# Install poetry
RUN pip install --no-cache-dir poetry

# Configure poetry to not create virtual environments (we're in Docker)
RUN poetry config virtualenvs.create false

# Set working directory
WORKDIR /server

# Copy poetry files first for better layer caching
COPY server/pyproject.toml server/poetry.lock* ./

# Install Python dependencies
RUN poetry install --no-interaction --no-ansi

# Copy the rest of the server application
COPY server/ .

# Copy built frontend from the frontend-builder stage
COPY --from=frontend-builder /server/static /server/static

# Ensure helper scripts are executable
RUN chmod +x ./scripts/*.sh ./scripts/*.py
COPY server/rootfs/ /
RUN chmod +x /etc/services.d/api/run /etc/services.d/recorder/run /etc/cont-init.d/00-migrations /etc/cont-init.d/01-plugin-requirements

# Create volumes
VOLUME ["/etc/pidentify/config", "/etc/pidentify/music", "/server/music_id/plugins"]

EXPOSE 8000

# Run the server via s6-overlay
ENTRYPOINT ["/init"]