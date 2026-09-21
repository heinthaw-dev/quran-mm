import http.server
import socketserver
import os

PORT = 8080
SERVE_DIR = os.path.join(os.path.dirname(__file__), "pwa", "public")

class CORSHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SERVE_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        print(f"  {self.address_string()} - {args[0]}")

with socketserver.TCPServer(("", PORT), CORSHandler) as httpd:
    print(f"Audio server running at http://localhost:{PORT}")
    print(f"Serving: {SERVE_DIR}")
    print("Press Ctrl+C to stop.")
    httpd.serve_forever()
