import json
import logging
from typing import Dict, List, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # All connected clients
        self.active_connections: Set[WebSocket] = set()
        # Department-specific connections: e.g. "police", "ambulance", "fireservice", "admin"
        self.department_connections: Dict[str, Set[WebSocket]] = {
            "admin": set(),
            "user": set(),
            "police": set(),
            "ambulance": set(),
            "fireservice": set()
        }

    async def connect(self, websocket: WebSocket, role: str = "user"):
        await websocket.accept()
        self.active_connections.add(websocket)
        role_key = role.lower()
        if role_key not in self.department_connections:
            self.department_connections[role_key] = set()
        self.department_connections[role_key].add(websocket)
        logger.info(f"WebSocket client connected with role: {role}. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        for role_key, sockets in self.department_connections.items():
            if websocket in sockets:
                sockets.remove(websocket)
        logger.info(f"WebSocket client disconnected. Total active: {len(self.active_connections)}")

    async def broadcast_to_all(self, message: dict):
        """Broadcast an event to every connected client."""
        data_str = json.dumps(message)
        dead_connections = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(data_str)
            except Exception as e:
                logger.warning(f"Error broadcasting to socket: {e}")
                dead_connections.append(connection)
        for dead in dead_connections:
            self.disconnect(dead)

    async def broadcast_to_role(self, role: str, message: dict):
        """Broadcast an event only to a specific department / role and to admin."""
        data_str = json.dumps(message)
        role_key = role.lower()
        targets = set()
        if role_key in self.department_connections:
            targets.update(self.department_connections[role_key])
        # Always also notify admin
        if "admin" in self.department_connections:
            targets.update(self.department_connections["admin"])

        dead_connections = []
        for connection in targets:
            try:
                await connection.send_text(data_str)
            except Exception as e:
                logger.warning(f"Error sending to {role} socket: {e}")
                dead_connections.append(connection)
        for dead in dead_connections:
            self.disconnect(dead)

ws_manager = ConnectionManager()
