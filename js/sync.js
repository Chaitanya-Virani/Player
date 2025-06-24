let socket;
let roomCode = "";
let role = "";

function updateRoomUI() {
  document.getElementById("room-code-display").textContent = roomCode || "-";
  document.getElementById("role-display").textContent = role ? (role.charAt(0).toUpperCase() + role.slice(1)) : "-";
  // Show leave room button only if in a room
  const leaveBtn = document.getElementById("leave-room-btn");
  if (roomCode && role) {
    leaveBtn.style.display = "block";
  } else {
    leaveBtn.style.display = "none";
  }
}

function connectSocket() {
  if (socket) {
    socket.close();
  }
  if (!roomCode || !role) return;
  socket = new WebSocket(`ws://localhost:8000/ws/${roomCode}/${role}`);

  socket.onopen = () => console.log("Connected to room:", roomCode);
  
  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const audio = document.getElementById("main-audio");
    const playPauseBtn = document.getElementById("playpause-btn");
    const icon = playPauseBtn.querySelector("i");
    if (msg.action === "play") {
      audio.currentTime = msg.time;
      audio.play();
      icon.classList.remove("fa-circle-play");
      icon.classList.add("fa-circle-pause");
    } else if (msg.action === "pause") {
      audio.pause();
      icon.classList.remove("fa-circle-pause");
      icon.classList.add("fa-circle-play");
    }
  };
}

function sendPlay() {
  const audio = document.getElementById("main-audio");
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      action: "play",
      time: audio.currentTime
    }));
  }
}

function sendPause() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: "pause" }));
  }
}

function handlePlayPause() {
  const audio = document.getElementById("main-audio");
  const playPauseBtn = document.getElementById("playpause-btn");
  const icon = playPauseBtn.querySelector("i");
  if (audio.paused) {
    audio.play();
    icon.classList.remove("fa-circle-play");
    icon.classList.add("fa-circle-pause");
    sendPlay();
  } else {
    audio.pause();
    icon.classList.remove("fa-circle-pause");
    icon.classList.add("fa-circle-play");
    sendPause();
  }
}

function joinRoom() {
  const input = document.getElementById("room-code-input");
  const code = input.value.trim();
  if (code) {
    roomCode = code;
    role = "guest";
    updateRoomUI();
    connectSocket();
  }
}

function createRoom() {
  roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  role = "host";
  updateRoomUI();
  connectSocket();
  alert(`Room created! Your room code is: ${roomCode}`);
}

function leaveRoom() {
  if (socket) {
    socket.close();
    socket = null;
  }
  roomCode = "";
  role = "";
  updateRoomUI();
}

window.onload = () => {
  updateRoomUI();
  document.getElementById("playpause-btn").onclick = handlePlayPause;
  document.getElementById("join-room-btn").onclick = joinRoom;
  document.getElementById("create-room-btn").onclick = createRoom;
  document.getElementById("leave-room-btn").onclick = leaveRoom;
};
