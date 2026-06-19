import os
from pathlib import Path


def load_local_env(path=".env"):
    env_path = Path(path)
    if not env_path.exists():
        return

    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_local_env()


def env(name, default=None):
    return os.getenv(name, default)


def use_supabase():
    return env("DATA_SOURCE", "csv").lower() == "supabase"
