FROM python:3.11
LABEL authors="pat dill"

# create directories
WORKDIR /

# dependencies
RUN apt-get update && apt-get install -y ffmpeg libportaudio2

# Python requirements
COPY . /server
WORKDIR /server
RUN pip install poetry
RUN poetry install

# create volumes
 VOLUME ["/appdata/yafs", "/files"]

EXPOSE 8000
WORKDIR /server
CMD ["/usr/bin/bash", "./run.sh"]