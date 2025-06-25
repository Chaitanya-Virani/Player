from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from backend.rooms import RoomManager
import json

app = FastAPI()
room_manager = RoomManager()

# Allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Set to your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/{room_code}/{role}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, role: str):
    connected = await room_manager.connect(room_code, websocket, role)
    if not connected:
        return
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("action") == "join" and role == "guest":
                    await room_manager.set_guest_name(room_code, websocket, msg.get("name", ""))
                elif msg.get("action") in ["play", "pause"]:
                    await room_manager.broadcast(room_code, websocket, data)
            except Exception:
                pass
    except:
        await room_manager.disconnect(room_code, websocket)
