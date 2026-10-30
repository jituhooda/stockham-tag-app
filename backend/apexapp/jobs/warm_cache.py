"""Prefetch reference lists so the first user of the day doesn't wait on eMachine."""

from __future__ import annotations

import logging

from ..integrations.emachine import EmachineError, get_emachine

log = logging.getLogger(__name__)
QUERIES = ("employees", "materials", "equipment", "expenses", "laborRates", "tags")


def warm_master_data() -> None:
    client = get_emachine()
    for name in QUERIES:
        try:
            client.run(name)
        except EmachineError as e:
            log.info("Cache warm-up skipped %s: %s", name, e)
            return  # eMachine unavailable; no point trying the rest


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    warm_master_data()
