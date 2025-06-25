let socket;
let roomCode = "";
let role = "";
let userName = "";

function updateRoomUI() {
  // Show or hide the room info section based on roomCode
  const roomInfoSection = document.getElementById("room-info-section");
  if (roomCode) {
    roomInfoSection.style.display = "flex";
  } else {
    roomInfoSection.style.display = "none";
  }
  document.getElementById("room-code-display").textContent = roomCode || "-";
  document.getElementById("role-display").textContent = role ? (role.charAt(0).toUpperCase() + role.slice(1)) : "-";
  // Show leave room button only if in a room
  const leaveBtn = document.getElementById("leave-room-btn");
  if (roomCode && role) {
    leaveBtn.style.display = "block";
  } else {
    leaveBtn.style.display = "none";
  }
  // Show 'Joined as' row only if role is set
  const joinedAsRow = document.getElementById("joined-as-row");
  if (role) {
    joinedAsRow.style.display = "flex";
  } else {
    joinedAsRow.style.display = "none";
  }
  // Clear guest list if not host
  if (role !== "host") {
    document.getElementById("guest-list").innerHTML = "";
  }
}

function connectSocket() {
  if (socket) {
    socket.close();
  }
  if (!roomCode || !role) return;
  // Build WebSocket URL dynamically based on current host and protocol
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsHost = window.location.hostname;
  const wsPort = 8000; // ensure this matches your backend port
  socket = new WebSocket(`${wsProtocol}://${wsHost}:${wsPort}/ws/${roomCode}/${role}`);

  let connectionConfirmed = false;

  socket.onopen = () => {
    if (role === "guest" && userName) {
      socket.send(JSON.stringify({ action: "join", name: userName }));
    }
    console.log("WebSocket connection opened.");
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.error) {
        alert(msg.error);
        console.log(`Error from server: ${msg.error}`);
        leaveRoom();
        return;
      }
      if (!connectionConfirmed) {
        connectionConfirmed = true;
        console.log("Connected to room:", roomCode);
      }
      if (msg.action === "guest_list" && role === "host") {
        const guestListDiv = document.getElementById("guest-list");
        if (msg.guests && msg.guests.length > 0) {
          guestListDiv.innerHTML = "<b>Guests:</b> " + msg.guests.map(g => `<span>${g}</span>`).join(", ");
        } else {
          guestListDiv.innerHTML = "<b>Guests:</b> None";
        }
        console.log("Updated guest list:", msg.guests);
        return;
      }
      const audio = document.getElementById("main-audio");
      const playPauseBtn = document.getElementById("playpause-btn");
      const icon = playPauseBtn.querySelector("i");
      if (msg.action === "play") {
        audio.currentTime = msg.time;
        audio.play();
        icon.classList.remove("fa-circle-play");
        icon.classList.add("fa-circle-pause");
        console.log("Playback started (sync)");
      } else if (msg.action === "pause") {
        audio.pause();
        icon.classList.remove("fa-circle-pause");
        icon.classList.add("fa-circle-play");
        console.log("Playback paused (sync)");
      }
    } catch (e) {
      // Not a JSON message, ignore
    }
  };

  socket.onclose = () => {
    if (!connectionConfirmed) {
      console.log("WebSocket connection closed before confirmation.");
      updateRoomUI();
    } else {
      console.log("WebSocket connection closed.");
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
    userName = prompt("Enter your name to join the room:");
    if (!userName) {
      alert("Name is required to join the room.");
      console.log("Join room cancelled: no name entered.");
      return;
    }
    roomCode = code;
    role = "guest";
    console.log(`Attempting to join room: ${roomCode} as ${userName}`);
    updateRoomUI();
    connectSocket();
  } else {
    console.log("Join room failed: no room code entered.");
  }
}

function createRoom() {
  roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  role = "host";
  console.log(`Room created! Your room code is: ${roomCode}`);
  updateRoomUI();
  connectSocket();
  alert(`Room created! Your room code is: ${roomCode}`);
}

function leaveRoom() {
  if (socket) {
    socket.close();
    socket = null;
  }
  if (roomCode || role || userName) {
    console.log(`Left room: ${roomCode} (role: ${role}, user: ${userName})`);
  }
  roomCode = "";
  role = "";
  userName = "";
  updateRoomUI();
}

window.onload = () => {
  updateRoomUI();
  document.getElementById("playpause-btn").onclick = handlePlayPause;
  document.getElementById("join-room-btn").onclick = joinRoom;
  document.getElementById("create-room-btn").onclick = createRoom;
  document.getElementById("leave-room-btn").onclick = leaveRoom;
};
