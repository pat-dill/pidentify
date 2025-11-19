#!/usr/bin/env bash

alembic upgrade head
chrt -f 99 python ./background/sound.py &
fastapi run ./app.py --port 8000
