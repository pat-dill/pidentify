#!/usr/bin/env bash

alembic upgrade head
chrt -f 99 python ./background/sound.py &
python main.py
