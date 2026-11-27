"""Loopback-only release candidate server, with normal HTTP gzip negotiation.
No content substitutions, client-specific responses or disabled browser features.
Matches the release's documented mod_deflate text MIME types, not its TLS/CDN.
"""
import argparse
import gzip
import io
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

MIME = {"text/html", "text/plain", "text/css", "text/javascript", "application/javascript", "application/json", "application/xml", "text/xml", "image/svg+xml"}

def accepts_gzip(header):
    for part in header.split(","):
        name, *params = part.strip().lower().split(";")
        if name.strip() != "gzip":
            continue
        q = 1.0
        for param in params:
            key, _, value = param.strip().partition("=")
            if key == "q":
                try:
                    q = float(value)
                except ValueError:
                    q = 0
        return 0 < q <= 1
    return False

class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    def send_head(self):
        if not accepts_gzip(self.headers.get("Accept-Encoding", "")) or self.headers.get("Range"):
            return super().send_head()
        path = Path(self.translate_path(self.path))
        if path.is_dir():
            if not self.path.split("?", 1)[0].endswith("/"):
                return super().send_head()
            path = path / "index.html"
        if not path.is_file() or self.guess_type(str(path)).split(";", 1)[0] not in MIME:
            return super().send_head()
        if path.stat().st_size < 256:
            return super().send_head()
        body = gzip.compress(path.read_bytes(), compresslevel=6, mtime=0)
        self.send_response(200)
        self.send_header("Content-Type", self.guess_type(str(path)))
        self.send_header("Content-Encoding", "gzip")
        self.send_header("Vary", "Accept-Encoding")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Last-Modified", self.date_time_string(path.stat().st_mtime))
        self.end_headers()
        return io.BytesIO(body)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", required=True)
    args = parser.parse_args()
    os.chdir(Path(args.directory).resolve(strict=True))
    ThreadingHTTPServer(("127.0.0.1", 4173), Handler).serve_forever()
