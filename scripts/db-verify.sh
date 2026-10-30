#!/usr/bin/env bash
# Compare the live schema with data-model/model.json.  --dump also rewrites database/schema/<dialect>/schema.sql
source "$(dirname "$0")/_common.sh"
backend_py -m apexapp.database.check --verify "$@"
