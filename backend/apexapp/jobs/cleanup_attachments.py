"""Delete stored files that no attachment row refers to (left by failed requests).

Run: ``python -m apexapp.jobs.cleanup_attachments [--dry-run]``
"""

from __future__ import annotations

import argparse
import time

from ..database.connection import get_engine
from ..repositories.attachments import all_storage_keys
from ..services import storage

MIN_AGE_SECONDS = 3600  # never touch files a request may still be committing


def find_orphans() -> list[str]:
    with get_engine().connect() as conn:
        referenced = all_storage_keys(conn)
    now = time.time()
    return sorted(
        k for k in storage.all_keys() - referenced
        if now - storage.path_for(k).stat().st_mtime > MIN_AGE_SECONDS
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    orphans = find_orphans()
    for key in orphans:
        if not args.dry_run:
            storage.remove(key)
    print(f"{'Would remove' if args.dry_run else 'Removed'} {len(orphans)} orphaned file(s)")


if __name__ == "__main__":
    main()
