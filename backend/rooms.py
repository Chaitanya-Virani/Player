from typing import Dict, List
from fastapi import WebSocket

class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, room_code: str, websocket: WebSocket, role: str):
        await websocket.accept()
        if room_code not in self.rooms:
            self.rooms[room_code] = []
        self.rooms[room_code].append(websocket)

    async def disconnect(self, room_code: str, websocket: WebSocket):
        self.rooms[room_code].remove(websocket)
        if not self.rooms[room_code]:
            del self.rooms[room_code]

    async def broadcast(self, room_code: str, sender: WebSocket, message: str):
        for connection in self.rooms.get(room_code, []):
            if connection != sender:
                await connection.send_text(message)
