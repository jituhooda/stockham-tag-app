import datetime as dt


def utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def as_utc(v: dt.datetime | None) -> dt.datetime | None:
    """SQLite hands back naive datetimes; treat them as UTC."""
    if v is None:
        return None
    return v if v.tzinfo else v.replace(tzinfo=dt.timezone.utc)
