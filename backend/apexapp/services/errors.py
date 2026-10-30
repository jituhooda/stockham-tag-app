class ServiceError(Exception):
    status_code = 400

    def __init__(self, detail: str, problems: list[str] | None = None):
        super().__init__(detail)
        self.detail = detail
        self.problems = problems or []


class NotFound(ServiceError):
    status_code = 404


class Conflict(ServiceError):
    status_code = 409


class Invalid(ServiceError):
    status_code = 422


class UpstreamUnavailable(ServiceError):
    status_code = 502
