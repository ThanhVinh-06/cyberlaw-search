"""Serve only the frontend, regardless of the current working directory."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Preview the CyberLaw frontend locally")
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")

    frontend = Path(__file__).resolve().parent.parent / "frontend"
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
