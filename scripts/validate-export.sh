#!/usr/bin/env bash
# Validate that this export is complete and intact.
#   scripts/validate-export.sh                 structure, JSON/YAML syntax, artifact hashes
#   scripts/validate-export.sh --update-hashes rewrite .apexstudio/artifact-hashes.json
#   scripts/validate-export.sh --tests         also run the frontend unit tests and build
source "$(dirname "$0")/_common.sh"
need python3

update=0; tests=0
for arg in "$@"; do
  case "$arg" in
    --update-hashes) update=1 ;;
    --tests) tests=1 ;;
    *) die "Unknown option $arg" ;;
  esac
done

info "Checking structure, syntax and hashes"
UPDATE_HASHES=$update python3 - "$ROOT" <<'PY'
import hashlib, json, os, subprocess, sys
from pathlib import Path

root = Path(sys.argv[1])
manifest = json.loads((root / "manifest.json").read_text())
errors = []

for rel in manifest["structure"]["required"]:
    if not (root / rel).exists():
        errors.append(f"missing: {rel}")

for p in sorted(root.rglob("*.json")):
    if any(part in {"node_modules", ".venv", "dist", ".git"} for part in p.parts):
        continue
    try:
        json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        errors.append(f"invalid JSON: {p.relative_to(root)}: {e}")

try:
    import yaml
    for p in list(root.glob("*.yml")) + list((root / "api").glob("*.yaml")) + list((root / ".github").rglob("*.yml")):
        try:
            list(yaml.safe_load_all(p.read_text(encoding="utf-8").replace("!reset", "").replace("!override", "")))
        except Exception as e:
            errors.append(f"invalid YAML: {p.relative_to(root)}: {e}")
except ImportError:
    print(" ! pyyaml not available; YAML not checked")

# Hash every tracked file except the hash file itself.
try:
    files = subprocess.run(["git", "ls-files", "-co", "--exclude-standard"], cwd=root, capture_output=True, text=True, check=True).stdout.split()
except Exception:
    files = [str(p.relative_to(root)) for p in root.rglob("*") if p.is_file()]
hash_file = ".apexstudio/artifact-hashes.json"
files = sorted(f for f in files if f != hash_file and (root / f).is_file())
digests = {f: hashlib.sha256((root / f).read_bytes()).hexdigest() for f in files}

target = root / hash_file
if os.environ.get("UPDATE_HASHES") == "1":
    total = hashlib.sha256("".join(f"{k}:{v}\n" for k, v in digests.items()).encode()).hexdigest()
    target.write_text(json.dumps({
        "algorithm": "sha256",
        "generatedBy": "scripts/validate-export.sh --update-hashes",
        "fileCount": len(digests),
        "treeHash": total,
        "files": digests,
    }, indent=2) + "\n")
    print(f" ✓ wrote hashes for {len(digests)} files")
else:
    recorded = json.loads(target.read_text())["files"]
    changed = [f for f in recorded if f in digests and digests[f] != recorded[f]]
    missing = [f for f in recorded if f not in digests]
    added = [f for f in digests if f not in recorded]
    for label, items in (("changed", changed), ("missing", missing), ("not in hash list", added)):
        for f in items:
            errors.append(f"{label}: {f}")

if errors:
    print("\n".join(f" ✗ {e}" for e in errors))
    sys.exit(1)
print(f" ✓ {len(manifest['structure']['required'])} required paths present, JSON/YAML valid, {len(digests)} files hashed")
PY

if [[ $tests == 1 ]]; then
  info "Frontend unit tests";       (cd "$ROOT/frontend" && npm test --silent)
  info "Frontend build";            (cd "$ROOT/frontend" && npm run build --silent >/dev/null)
  ok "All tests passed (browser tests: see tests/e2e/README.md)"
fi
ok "Export is valid"
