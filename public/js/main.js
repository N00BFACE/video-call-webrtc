// Connet to the server
const socket = io();

// Get DOM elements
const userNameInput = document.getElementById('userName');
const roomIdInput = document.getElementById('roomId');
const joinRoomButton = document.getElementById('joinRoom');
const createRoomButton = document.getElementById('createRoom');
const statusMessage = document.getElementById('statusMessage');

function generateRoomId() {
    // Generate something like "a1b2c3d4"
    return Math.random().toString(36).substring(2, 10);
}

// Create room button - go directly as owner
createRoomButton.addEventListener('click', () => {
    const userName = userNameInput.value.trim();

    if (!userName) {
        alert('Please enter a user name');
        return;
    }

    // Generate a random room ID
    const roomId = generateRoomId();
    window.location.href = `room.html?roomId=${roomId}&userName=${encodeURIComponent(userName)}&isOwner=true`;
});

// Add event listener to the button
joinRoomButton.addEventListener('click', () => {
    const userName = userNameInput.value.trim();
    const roomId = roomIdInput.value.trim();

    if (!userName) {
        alert('Please enter a user name');
        return;
    }

    if (!roomId) {
        alert('Please enter a room ID');
        return;
    }

    statusMessage.textContent = 'Requesting to join...';

    // Send join request to server
    socket.emit('join-request', {
        roomId,
        userName
    });
});

// Handle join accepted
socket.on('join-accepted', (data) => {
    const userName = userNameInput.value.trim();
    statusMessage.textContent = 'Request accepted! Joining...';

    // Now go to room page
    window.location.href = `room.html?roomId=${data.roomId}&userName=${encodeURIComponent(userName)}&isOwner=false`;
});

// handle join rejected
socket.on('join-rejected', (data) => {
    statusMessage.textContent = 'Request rejected!';
});

// Handle room not found
socket.on('room-not-found', () => {
    statusMessage.textContent = 'Room not found or no one is there';
});