FROM python:3.11
LABEL authors="pat dill"

# create directories
WORKDIR /

# dependencies
RUN apt-get update && apt-get install -y ffmpeg libportaudio2

# Python requirements
COPY . /pidentify
WORKDIR /pidentify
RUN pip install -r server/requirements.txt

# create volumes
# VOLUME ["/appdata/yafs", "/files"]

EXPOSE 8000
WORKDIR /pidentify
CMD ["/usr/bin/bash", "./run.sh"]