"""Back up / restore the database and the attachments directory together.

    python -m apexapp.database.backup create [--out backups]
    python -m apexapp.database.backup restore <backup-dir> [--yes]
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import shutil
import sqlite3
import subprocess
import sys
import tarfile
from pathlib import Path

from sqlalchemy.engine import make_url

from .. import __version__
from ..config import get_settings
from .check import redact


def _pg_url(url: str) -> str:
    return make_url(url).set(drivername="postgresql").render_as_string(hide_password=False)


def _sqlite_path(url: str) -> Path:
    return Path(make_url(url).database or "")


def create(out_root: Path) -> Path:
    s = get_settings()
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = out_root / stamp
    out.mkdir(parents=True)
    url = s.database_url
    if url.startswith("sqlite"):
        src = sqlite3.connect(_sqlite_path(url))
        dst = sqlite3.connect(out / "db.sqlite3")
        with dst:
            src.backup(dst)  # consistent even while the app is writing
        src.close()
        dst.close()
        db_file = "db.sqlite3"
    else:
        if not shutil.which("pg_dump"):
            raise SystemExit("pg_dump is not installed")
        subprocess.run(["pg_dump", "-Fc", "--no-owner", "-f", str(out / "db.pgdump"), _pg_url(url)], check=True)
        db_file = "db.pgdump"
    with tarfile.open(out / "attachments.tar.gz", "w:gz") as tar:
        if s.attachments_dir.exists():
            tar.add(s.attachments_dir, arcname="attachments")
    (out / "manifest.json").write_text(json.dumps({
        "createdAt": stamp, "appVersion": __version__, "database": redact(url),
        "dialect": "sqlite" if url.startswith("sqlite") else "postgres", "databaseFile": db_file,
    }, indent=2) + "\n")
    return out


def restore(src: Path, assume_yes: bool) -> None:
    s = get_settings()
    manifest = json.loads((src / "manifest.json").read_text())
    url = s.database_url
    dialect = "sqlite" if url.startswith("sqlite") else "postgres"
    if manifest["dialect"] != dialect:
        raise SystemExit(f"Backup is {manifest['dialect']} but DATABASE_URL is {dialect}; use scripts/db-switch.sh after restoring")
    if not assume_yes:
        answer = input(f"Replace ALL data in {redact(url)} and {s.attachments_dir} with {src.name}? [y/N] ")
        if answer.strip().lower() != "y":
            raise SystemExit("Cancelled")
    if dialect == "sqlite":
        target = _sqlite_path(url)
        target.parent.mkdir(parents=True, exist_ok=True)
        # Copy page-by-page into the live file so open connections see the restored data.
        source = sqlite3.connect(src / manifest["databaseFile"])
        dest = sqlite3.connect(target)
        with dest:
            source.backup(dest)
        source.close()
        dest.close()
    else:
        subprocess.run(["pg_restore", "--clean", "--if-exists", "--no-owner", "-d", _pg_url(url), str(src / manifest["databaseFile"])], check=True)
    if s.attachments_dir.exists():
        shutil.rmtree(s.attachments_dir)
    with tarfile.open(src / "attachments.tar.gz") as tar:
        tar.extractall(s.attachments_dir.parent, filter="data")
    extracted = s.attachments_dir.parent / "attachments"
    if extracted != s.attachments_dir and extracted.exists():
        extracted.rename(s.attachments_dir)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("create")
    c.add_argument("--out", default="backups")
    r = sub.add_parser("restore")
    r.add_argument("path")
    r.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if args.cmd == "create":
        print(f"Backup written to {create(Path(args.out))}")
    else:
        restore(Path(args.path), args.yes)
        print("Restore complete")


if __name__ == "__main__":
    sys.exit(main())
