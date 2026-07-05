import http.server
import socketserver
import urllib.request
import urllib.error
import sys

PORT = 3000
TARGET_HOST = "http://localhost:5600"

class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"  # Fix connection resets by forcing HTTP/1.1

    def do_GET(self):
        if self.path.startswith("/api/"):
            self.proxy_request("GET")
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            self.proxy_request("POST")
        else:
            super().do_POST()

    def proxy_request(self, method):
        url = f"{TARGET_HOST}{self.path}"
        headers = {key: val for key, val in self.headers.items() if key.lower() not in ("host", "content-length")}
        
        # Read request body if POST
        data = None
        if method == "POST":
            content_length = int(self.headers.get('Content-Length', 0))
            data = self.rfile.read(content_length)

        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        
        try:
            with urllib.request.urlopen(req) as response:
                self.send_response(response.status)
                for key, val in response.getheaders():
                    if key.lower() not in ("transfer-encoding",):
                        self.send_header(key, val)
                self.end_headers()
                self.wfile.write(response.read())
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            for key, val in e.headers.items():
                if key.lower() not in ("transfer-encoding",):
                    self.send_header(key, val)
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode('utf-8'))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        PORT = int(sys.argv[1])
    server_address = ('', PORT)
    httpd = ThreadingHTTPServer(server_address, ProxyHTTPRequestHandler)
    print(f"Liminal.ai threaded server running on http://localhost:{PORT} with API proxy to {TARGET_HOST}")
    httpd.serve_forever()
