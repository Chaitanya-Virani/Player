from typing import Dict, List
from fastapi import WebSocket
import json

class RoomManager:
    def __init__(self):
        # Each room is a list of dicts: { 'websocket': WebSocket, 'role': str, 'name': str (for guests) }
        self.rooms: Dict[str, List[dict]] = {}

    def has_host(self, room_code: str) -> bool:
        # Returns True if a host is present in the room
        return any(conn['role'] == 'host' for conn in self.rooms.get(room_code, []))

    def get_host(self, room_code: str):
        for conn in self.rooms.get(room_code, []):
            if conn['role'] == 'host':
                return conn['websocket']
        return None

    def get_guests(self, room_code: str):
        return [conn['name'] for conn in self.rooms.get(room_code, []) if conn['role'] == 'guest' and 'name' in conn]

    async def connect(self, room_code: str, websocket: WebSocket, role: str) -> bool:
        await websocket.accept()
        if role == 'guest':
            # Only allow guest if host is present
            if not self.has_host(room_code):
                await websocket.send_text('{"error": "No room exists with that code."}')
                await websocket.close()
                return False
        if room_code not in self.rooms:
            self.rooms[room_code] = []
        # For guests, name will be set after join message
        self.rooms[room_code].append({'websocket': websocket, 'role': role})
        return True

    async def set_guest_name(self, room_code: str, websocket: WebSocket, name: str):
        for conn in self.rooms.get(room_code, []):
            if conn['websocket'] == websocket and conn['role'] == 'guest':
                conn['name'] = name
        await self.broadcast_guest_list(room_code)

    async def broadcast_guest_list(self, room_code: str):
        guests = self.get_guests(room_code)
        host_ws = self.get_host(room_code)
        if host_ws:
            await host_ws.send_text(json.dumps({"action": "guest_list", "guests": guests}))

    async def disconnect(self, room_code: str, websocket: WebSocket):
        if room_code in self.rooms:
            self.rooms[room_code] = [conn for conn in self.rooms[room_code] if conn['websocket'] != websocket]
            if not self.rooms[room_code]:
                del self.rooms[room_code]
            else:
                await self.broadcast_guest_list(room_code)

    async def broadcast(self, room_code: str, sender: WebSocket, message: str):
        for conn in self.rooms.get(room_code, []):
            if conn['websocket'] != sender:
                await conn['websocket'].send_text(message)
