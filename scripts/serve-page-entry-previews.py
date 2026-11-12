#!/usr/bin/env python3
"""Serve built Company/tools for isolated page-entry browser checks."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Event, Thread

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ['company', 'timer', 'clock', 'stopwatch', 'breathe', 'relax',
            'calculator', 'lava', 'metronome', 'sound', 'scenescript']

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

servers = []
try:
    for offset, project in enumerate(PROJECTS):
        directory = ROOT / project / 'dist'
        if not (directory / 'index.html').exists():
            raise RuntimeError(f'Build {project} before testing.')
        server = ThreadingHTTPServer(('127.0.0.1', 4390 + offset),
                                    partial(QuietHandler, directory=str(directory)))
        servers.append(server)
        Thread(target=server.serve_forever, daemon=True).start()
    Event().wait()
except KeyboardInterrupt:
    pass
finally:
    for server in servers:
        server.shutdown()
        server.server_close()
