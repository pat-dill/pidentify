#!/usr/bin/env bash
set -euo pipefail

cd /server
exec chrt -f 99 python -u ./background/sound.py

