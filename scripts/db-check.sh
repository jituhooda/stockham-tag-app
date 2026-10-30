#!/usr/bin/env bash
# Can we reach the database, and is its schema current? Exit 1 if not.
source "$(dirname "$0")/_common.sh"
backend_py -m apexapp.database.check "$@"
