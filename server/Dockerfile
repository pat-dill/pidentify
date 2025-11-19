FROM python:3.13
LABEL authors="pat dill"

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libportaudio2 \
    && rm -rf /var/lib/apt/lists/*

# Install poetry
RUN pip install --no-cache-dir poetry

# Configure poetry to not create virtual environments (we're in Docker)
RUN poetry config virtualenvs.create false

# Set working directory
WORKDIR /server

# Copy poetry files first for better layer caching
COPY pyproject.toml poetry.lock* ./

# Install Python dependencies
RUN poetry install --no-interaction --no-ansi

# Copy the rest of the application
COPY . .

# Make run.sh executable
RUN chmod +x ./run.sh

# Create volumes
VOLUME ["/appdata/yafs", "/files"]

EXPOSE 8000

# Run the server
CMD ["/usr/bin/bash", "./run.sh"]