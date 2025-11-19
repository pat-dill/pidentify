#!/usr/bin/env bash
set -euo pipefail

cd /server
exec fastapi run ./app.py --port "${PORT:-8000}"

