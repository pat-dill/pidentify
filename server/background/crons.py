import asyncio
import functools
import subprocess
import sys
import time
from datetime import timedelta
from pathlib import Path

import asyncclick as click

sys.path.append(str(Path(__file__).parents[2]))

from server.logger import logger
from server.config import env_config
from server.db import get_history_entries, update_history_entries
from server.sql_schemas import HistoryEntry

# task registration

tasks: dict = {}


def cron(run_every: timedelta):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper():
            try:
                await func()
            except Exception as e:
                logger.error(f"{func.__name__}: {e!s}")

        tasks[func.__name__] = {
            "fn": func,
            "interval": run_every
        }

        return wrapper

    return decorator


# tasks



# command


@click.command()
@click.argument("task_name", required=False)
async def run_cron(task_name: str = None):
    if task_name:
        task = tasks[task_name]
        await task["fn"]()

    else:
        while True:
            await asyncio.sleep(1)
            seconds = int(time.time())

            for task_name, task in tasks.items():
                interval: timedelta = task["interval"]
                if seconds % interval.total_seconds() == 0:
                    logger.info(f"running {task_name}")
                    subprocess.Popen([sys.executable, __file__, task_name])


if __name__ == "__main__":
    run_cron()
