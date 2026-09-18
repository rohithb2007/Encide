"""
MED-NET AI: Real-Time WebSocket Connection & Event Manager
"""

import json
from typing import Any
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict[str, Any]):
        """Broadcasts a JSON-encoded payload to all connected clients."""
        disconnected = []
        payload_str = json.dumps(message)
        for connection in self.active_connections:
            try:
                await connection.send_text(payload_str)
            except Exception:
                disconnected.append(connection)

        for dead_conn in disconnected:
            self.disconnect(dead_conn)


ws_manager = WebSocketManager()
