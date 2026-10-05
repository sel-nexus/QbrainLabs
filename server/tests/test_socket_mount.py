"""Regression guard for the Socket.IO ASGI mount.

This defect was silent in the worst way: all plain HTTP kept working, so the
server looked healthy while every real-time feature (collaborative use-case
intake, live scoring, matrix updates) was dead. The only other guard is
client/e2e/participant-flow.spec.ts, which needs a browser, a seeded Postgres
and a running Vite - too slow and too fragile to be the sole protection.

Background: engineio's ASGIApp matches on the raw scope['path'] and is
root_path-unaware, while Starlette's Mount advances scope['root_path'] WITHOUT
stripping scope['path']. So socketio_path must be the full client-visible path
('/ws/socket.io'), not 'socket.io' relative to the "/ws" mount prefix. With the
relative value, engineio fell through to its own not_found() handler: 404 for
polling, and a RuntimeError on websocket upgrade.
"""
from fastapi.testclient import TestClient

from app.core.socket_manager import SOCKETIO_PATH, socket_app
from app.main import app

# The path the client hardcodes in client/src/lib/socket.ts, and that
# client/vite.config.ts and client/nginx.conf both forward unchanged.
CLIENT_VISIBLE_PATH = "/ws/socket.io"
HANDSHAKE = f"{CLIENT_VISIBLE_PATH}/?EIO=4&transport=polling"


def test_socketio_configured_with_client_visible_path():
    """socketio_path must include the '/ws' mount prefix, not be relative to it."""
    assert SOCKETIO_PATH == CLIENT_VISIBLE_PATH
    # engineio normalizes to a leading+trailing slash; this is the string it
    # actually prefix-matches incoming scope['path'] against.
    assert socket_app.engineio_path == f"{CLIENT_VISIBLE_PATH}/"


def test_engineio_handshake_is_routed_not_404():
    """Exercise real ASGI routing end to end - this is what caught the bug.

    No context manager: we deliberately skip lifespan so this stays a fast,
    DB-free unit test. A successful Engine.IO handshake returns 200 with an
    'open' packet (type '0'); the bug produced a hard 404 from engineio's own
    not_found() handler.
    """
    response = TestClient(app).get(HANDSHAKE)

    assert response.status_code != 404, (
        "Engine.IO handshake 404'd - socket_app is not receiving "
        f"{CLIENT_VISIBLE_PATH!r}. Every real-time feature is broken."
    )
    assert response.status_code == 200
    # Engine.IO v4 open packet: payload starts with '0' followed by JSON
    # containing the session id.
    assert response.text.startswith("0"), response.text[:80]
    assert "sid" in response.text
