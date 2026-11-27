import gzip
import importlib.util
import tempfile
import threading
import unittest
from functools import partial
from pathlib import Path
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen

spec = importlib.util.spec_from_file_location("candidate_http", Path(__file__).resolve().parents[1] / "scripts" / "jrei-candidate-http.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class CandidateTransport(unittest.TestCase):
    def test_negotiation_and_exact_body(self):
        self.assertFalse(module.accepts_gzip("br, gzip;q=0"))
        self.assertTrue(module.accepts_gzip("br, gzip;q=0.8"))
        with tempfile.TemporaryDirectory() as directory:
            payload = ("<html>آموزش و پژوهش</html>" * 100).encode()
            Path(directory, "index.html").write_bytes(payload)
            server = ThreadingHTTPServer(("127.0.0.1", 0), partial(module.Handler, directory=directory))
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            try:
                url = "http://127.0.0.1:" + str(server.server_port) + "/"
                with urlopen(Request(url, headers={"Accept-Encoding": "gzip"})) as response:
                    self.assertEqual(response.headers.get("Content-Encoding"), "gzip")
                    self.assertEqual(gzip.decompress(response.read()), payload)
                with urlopen(Request(url, headers={"Accept-Encoding": "identity"})) as response:
                    self.assertIsNone(response.headers.get("Content-Encoding"))
                    self.assertEqual(response.read(), payload)
            finally:
                server.shutdown()
                server.server_close()
                worker.join()
