#!/usr/bin/env bash

alembic upgrade head
cd server
chrt -f 99 python ./background/sound.py &
python ./background/crons.py &
fastapi run ./app.py
