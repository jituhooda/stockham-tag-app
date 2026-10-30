"""Write the API contract to api/: openapi.json, openapi.yaml and postman-collection.json.

Run from backend/: ``uv run python -m apexapp.utils.export_openapi [output_dir]``
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

os.environ.setdefault("RUN_MIGRATIONS", "false")
os.environ.setdefault("WARM_CACHE", "0")


def build() -> dict:
    from ..main import create_app

    spec = create_app().openapi()
    spec["servers"] = [{"url": "/", "description": "Same origin as the web app"}]
    spec.setdefault("components", {})["securitySchemes"] = {
        "bearerAuth": {"type": "http", "scheme": "bearer", "description": "Required when authMode is 'token'"}
    }
    spec["security"] = [{"bearerAuth": []}, {}]
    return spec


def _example(schema: dict, components: dict, depth: int = 0):
    """A small example value for a JSON schema (enough to make Postman requests editable)."""
    if depth > 4:
        return None
    if "$ref" in schema:
        return _example(components[schema["$ref"].rsplit("/", 1)[-1]], components, depth + 1)
    for key in ("anyOf", "oneOf", "allOf"):
        if key in schema:
            options = [o for o in schema[key] if o.get("type") != "null"]
            return _example(options[0], components, depth + 1) if options else None
    if "default" in schema:
        return schema["default"]
    if "enum" in schema:
        return schema["enum"][0]
    t = schema.get("type")
    if t == "object":
        return {k: _example(v, components, depth + 1) for k, v in schema.get("properties", {}).items()}
    if t == "array":
        return [_example(schema.get("items", {}), components, depth + 1)] if schema.get("items") else []
    return {"string": "", "integer": 0, "number": 0, "boolean": False}.get(t)


def postman_collection(spec: dict) -> dict:
    components = spec.get("components", {}).get("schemas", {})
    folders: dict[str, list] = {}
    for path, ops in spec["paths"].items():
        for method, op in ops.items():
            url_path = [seg.replace("{", ":").replace("}", "") for seg in path.strip("/").split("/")]
            query = [
                {"key": p["name"], "value": "", "disabled": not p.get("required", False)}
                for p in op.get("parameters", []) if p["in"] == "query"
            ]
            variables = [{"key": p["name"], "value": ""} for p in op.get("parameters", []) if p["in"] == "path"]
            request: dict = {
                "method": method.upper(),
                "header": [{"key": "Accept", "value": "application/json"}],
                "url": {"raw": "{{baseUrl}}" + path, "host": ["{{baseUrl}}"], "path": url_path,
                        "query": query, "variable": variables},
                "description": op.get("description", ""),
            }
            content = op.get("requestBody", {}).get("content", {})
            if "application/json" in content:
                request["header"].append({"key": "Content-Type", "value": "application/json"})
                body = _example(content["application/json"]["schema"], components)
                request["body"] = {"mode": "raw", "raw": json.dumps(body, indent=2)}
            elif "multipart/form-data" in content:
                request["body"] = {"mode": "formdata", "formdata": [{"key": "file", "type": "file", "src": ""}]}
            folder = (op.get("tags") or ["other"])[0]
            folders.setdefault(folder, []).append({"name": op.get("summary", f"{method.upper()} {path}"), "request": request})
    return {
        "info": {
            "name": spec["info"]["title"],
            "description": spec["info"].get("description", ""),
            "version": spec["info"]["version"],
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
        "variable": [{"key": "baseUrl", "value": "http://localhost:8000"}, {"key": "token", "value": ""}],
        "item": [{"name": name, "item": items} for name, items in folders.items()],
    }


def main() -> None:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parents[3] / "api")
    out.mkdir(parents=True, exist_ok=True)
    spec = build()
    (out / "openapi.json").write_text(json.dumps(spec, indent=2) + "\n", encoding="utf-8")
    try:
        import yaml
    except ImportError:  # pragma: no cover
        print("pyyaml not installed; skipped openapi.yaml")
    else:
        (out / "openapi.yaml").write_text(yaml.safe_dump(spec, sort_keys=False, allow_unicode=True), encoding="utf-8")
    (out / "postman-collection.json").write_text(json.dumps(postman_collection(spec), indent=2) + "\n", encoding="utf-8")
    print(f"Wrote OpenAPI {spec['info']['version']} and the Postman collection to {out}")


if __name__ == "__main__":
    main()
