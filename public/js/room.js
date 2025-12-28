const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId');
const userName = urlParams.get('userName') || 'Anonymous';
const isOwner = urlParams.get('isOwner') === 'true';

// Display the room ID in the span element
const roomIdDisplay = document.getElementById('roomIdDisplay');
roomIdDisplay.textContent = roomId;

// Display local user name
document.getElementById('localUserName').textContent = userName + ' (You)';

// Connect to Socket.io
const socket = io();

// Get DOM elements
const videoContainer = document.querySelector('.video-container');
const localVideo = document.getElementById('localVideo');
const endCallButton = document.getElementById('endCallButton');
const muteButton = document.getElementById('muteButton');
const cameraButton = document.getElementById('cameraButton');

// Modal elements
const requestModal = document.getElementById('requestModal');
const requesterName = document.getElementById('requesterName');
const acceptButton = document.getElementById('acceptButton');
const rejectButton = document.getElementById('rejectButton');

// Store pending request info
let pendingRequests = [];

// WebRTC configuration
// STUN servers help discover your public IP address
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Store the peer connection
let peerConnections = new Map();

// Store remote user names
let remoteUserNames = new Map();

// Store the local stream
let localStream = null;

// Create an async function to initialize media
async function initializeMedia() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = stream;
        localStream = stream;

        if (isOwner) {
            // Owner creates the room
            socket.emit('create-room', { roomId, userName });
        } else {
            // Non-owner joins the room
            socket.emit('join-room', { roomId, userName });
        }
    } catch (error) {
        console.error('Error accessing media devices.', error);
        alert('Could not access camera/microphone');
    }
}

// Initialize media
initializeMedia();

// Dynamic Video Element Management
function createVideoElement(odId, name) {
    // Check if user already exists
    if (document.getElementById(`wrapper-${odId}`)) {
        return document.getElementById(`video-${odId}`);
    }

    const wrapper = document.createElement('div');
    wrapper.classList.add('video-wrapper');
    wrapper.id = `wrapper-${odId}`;

    const video = document.createElement('video');
    video.id = `video-${odId}`;
    video.autoplay = true;
    video.playsInline = true;

    const label = document.createElement('p');
    label.id = `label-${odId}`;
    label.textContent = name || 'Connecting...';

    wrapper.appendChild(video);
    wrapper.appendChild(label);
    videoContainer.appendChild(wrapper);

    updateVideoLayout();

    return video;
}

function removeVideoElement(odId) {
    const wrapper = document.getElementById(`wrapper-${odId}`);
    if (wrapper) {
        wrapper.remove();
        updateVideoLayout();
    }
}

function updateVideoLayout() {
    const count = videoContainer.children.length;
    if (count > 4) {
        videoContainer.classList.add('many-participants');
    } else {
        videoContainer.classList.remove('many-participants');
    }
}

// Handle incoming join requests
socket.on('join-request', (data) => {
    pendingRequests.push(data);
    showNextRequest();
});

function showNextRequest() {
    if (pendingRequests.length > 0 && requestModal.classList.contains('hidden')) {
        const request = pendingRequests[0];
        requesterName.textContent = request.userName;
        requestModal.classList.remove('hidden');
    }
}

// Accept button click
acceptButton.addEventListener('click', () => {
    if (pendingRequests.length > 0) {
        const request = pendingRequests.shift();
        socket.emit('join-accepted', {
            roomId: roomId,
            odId: request.odId,
            userName: request.userName,
        });

        requestModal.classList.add('hidden');
        showNextRequest();
    }
});

// Reject button click
rejectButton.addEventListener('click', () => {
    if (pendingRequests.length > 0) {
        const request = pendingRequests.shift();
        socket.emit('join-rejected', {
            roomId: roomId,
            odId: request.odId,
        });

        requestModal.classList.add('hidden');
        showNextRequest();
    }
});

// For existing users when joining a room
socket.on('existing-users', (users) => {
    // Create offers to all existing users
    users.forEach(user => {
        setTimeout(() => {
            createOffer(user.odId, user.userName);
        }, 500);
    });
});

// Listen to when other users join the room
socket.on('user-joined', (data) => {
    // The new user will send us an offer, we just wait
    createVideoElement(data.odId, data.userName);
});

// When we receive an offer, create an answer
socket.on('offer', async (data) => {
    await handleOffer(data.senderId, data.offer, data.senderName);
});

// When we receive an answer, set it as our remote description
socket.on('answer', async (data) => {
    await handleAnswer(data.senderId, data.answer);
});

// When we receive an ICE candidate, add it to the peer connection
socket.on('ice-candidate', async (data) => {
    await handleIceCandidate(data.senderId, data.candidate);
});

// Listen to when other users leave the room
socket.on('user-left', (odId) => {
    closePeerConnection(odId);
    removeVideoElement(odId);
});

// Handle socket disconnection
socket.on('disconnect', () => {
    // Clean up all connections
    peerConnections.forEach((pc, odId) => {
        pc.close();
        removeVideoElement(odId);
    });
    peerConnections.clear();
    remoteUserNames.clear();
});

// Create a new peer connection
function createPeerConnection(odId, remoteName) {
    // Close exisiting connection if any
    if (peerConnections.has(odId)) {
        peerConnections.get(odId).close();
    }

    // Create new RTCPeerConnection with our config
    const pc = new RTCPeerConnection(configuration);

    // Add local stream tracks to the connection
    // This sends our video/audio to the other peer
    localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
    });

    // Handle incoming tracks (others video/audio)
    pc.ontrack = (event) => {
        const video = document.getElementById(`video-${odId}`) || createVideoElement(odId, remoteName);
        video.srcObject = event.streams[0];

        // Update label
        const label = document.getElementById(`label-${odId}`);
        if (label && remoteName) {
            label.textContent = remoteName;
        }
    };

    // Handle ICE candidates
    // When we discover a network path, send it to the other peer
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                candidate: event.candidate,
                targetId: odId
            });
        }
    };

    // Monitor connection state for debugging
    pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            closePeerConnection(odId);
        }
    };

    // Store the connection
    peerConnections.set(odId, pc);
    remoteUserNames.set(odId, remoteName);

    return pc;
}

function closePeerConnection(odId) {
    const pc = peerConnections.get(odId);
    if (pc) {
        pc.close();
        peerConnections.delete(odId);
    }
    remoteUserNames.delete(odId);
    removeVideoElement(odId);
}

// Create and send an offer
// WebRTC Signaling
async function createOffer(odId, remoteName) {
    const pc = createPeerConnection(odId, remoteName);
    createVideoElement(odId, remoteName);

    // Create the offer
    const offer = await pc.createOffer();

    // Set it as our local description
    await pc.setLocalDescription(offer);

    // Send the offer to the other peer via signaling server
    socket.emit('offer', {
        offer: offer,
        targetId: odId,
        senderName: userName
    });
}

// Handle incoming offer and create answer
async function handleOffer(senderId, offer, senderName) {
    const pc = createPeerConnection(senderId, senderName);
    createVideoElement(senderId, senderName);

    // Set the remote description (the offer)
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    // Create an answer
    const answer = await pc.createAnswer();

    // Set it as our local description
    await pc.setLocalDescription(answer);

    // Send the answer to the other peer via signaling server
    socket.emit('answer', {
        answer: answer,
        targetId: senderId,
    });
}

// Handle incoming answer
async function handleAnswer(senderId, answer) {
    const pc = peerConnections.get(senderId);
    if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
}

// Handle incoming ICE candidate
async function handleIceCandidate(senderId, candidate) {
    const pc = peerConnections.get(senderId);
    if (pc && candidate) {
        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('Error adding ICE candidate: ', error);
        }
    }
}

// Handle the "End Call" button
endCallButton.addEventListener('click', () => {
    // Close all peer connections
    peerConnections.forEach((pc) => pc.close());
    peerConnections.clear();

    // Stop all local media tracks (turn off camera/mic)
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }

    // Redirect to the home page
    window.location.href = '/index.html';
});

// Mute/Unmute
muteButton.addEventListener('click', () => {
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        muteButton.textContent = audioTrack.enabled ? 'Mute' : 'Unmute';
    }
});

// Camera On/Off
cameraButton.addEventListener('click', () => {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        cameraButton.textContent = videoTrack.enabled ? 'Turn Camera Off' : 'Turn Camera On';
    }
});

// Clean up when page is closed or refreshed
window.addEventListener('beforeunload', () => {
    peerConnections.forEach((pc) => pc.close());
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
});