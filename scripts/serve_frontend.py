"""Start Vite, or serve the archived static preview with --legacy."""

import argparse
import shutil
import subprocess
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Preview the CyberLaw frontend locally")
    parser.add_argument("--port", type=int, default=5173)
    parser.add_argument("--legacy", action="store_true", help="Open the archived HTML prototype")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")

    root = Path(__file__).resolve().parent.parent
    frontend = root / "frontend"
    if not args.legacy:
        npm = shutil.which("npm.cmd") or shutil.which("npm")
        if not npm:
            parser.error("Node.js/npm is required. Install Node.js, then run npm ci in frontend.")
        if not (frontend / "node_modules").is_dir():
            parser.error("Dependencies are missing. Run npm ci in frontend first.")
        try:
            result = subprocess.run([npm, "run", "dev", "--", "--port", str(args.port)], cwd=frontend)
            parser.exit(result.returncode)
        except KeyboardInterrupt:
            parser.exit(0)

    frontend = root / "experiments" / "archive" / "frontend-static"
    if not (frontend / "index.html").is_file():
        parser.error(f"frontend/index.html was not found in {frontend.parent}")

    handler = partial(SimpleHTTPRequestHandler, directory=str(frontend))
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    except OSError as exc:
        parser.exit(1, f"Could not start preview: {exc}\nTry --port with another port.\n")

    with server:
        print(f"CyberLaw preview: http://127.0.0.1:{args.port}", flush=True)
        print("Press Ctrl+C to stop.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nPreview stopped.", flush=True)


if __name__ == "__main__":
    main()
