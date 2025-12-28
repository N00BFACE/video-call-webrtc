import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

// Create express app
const app = express();

// Create HTTP server using express app
const server = http.createServer(app);

// Create Socket.io instance attached to the HTTP server
const io = new Server(server);

// Track which room each socket is in
const socketRooms = new Map();

// Track room ownership
const roomOwners = new Map();

// Track existing users per room
const roomUsers = new Map();

// Handle connection events
io.on('connection', (socket) => {
    // Handle creating a room (becoming owner)
    socket.on('create-room', (data) => {
        const { roomId, userName } = data;
        socket.join(roomId);
        socketRooms.set(socket.id, roomId);
        roomOwners.set(roomId, socket.id);

        // Initialize room users list
        if (!roomUsers.has(roomId)) {
            roomUsers.set(roomId, new Map());
        }
        roomUsers.get(roomId).set(socket.id, userName);
    });

    // Handle join request (not joining yet, just requesting to join)
    socket.on('join-request', (data) => {
        const { roomId, userName } = data;
        const ownerId = roomOwners.get(roomId);

        if (ownerId) {
            // Send request to the room owner
            io.to(ownerId).emit('join-request', {
                roomId: roomId,
                odId: socket.id,
                userName: userName
            });
        } else {
            // Room doesn't exist on no owner
            socket.emit('room-not-found');
        }
    });

    // Handle owner accepting a request
    socket.on('join-accepted', (data) => {
        const { roomId, odId, userName } = data;

        // Notify the requester they can join
        io.to(odId).emit('join-accepted', { roomId, userName });
    });

    // Handle owner rejecting a request
    socket.on('join-rejected', (data) => {
        const { roomId, odId } = data;

        // Notify the requester they were rejected
        io.to(odId).emit('join-rejected', { roomId });
    });

    // Handle joining a room
    socket.on('join-room', (data) => {
        const { roomId, userName } = data;
        socket.join(roomId);

        // Track this socket's room
        socketRooms.set(socket.id, roomId);

        // Get existing users in the room
        const existingUsers = [];
        if (roomUsers.has(roomId)) {
            roomUsers.get(roomId).forEach((name, odId) => {
                existingUsers.push({ odId: odId, userName: name });
            });
        } else {
            roomUsers.set(roomId, new Map());
        }

        // Add this user to the room users
        roomUsers.get(roomId).set(socket.id, userName);

        // Send existing users to the new user
        socket.emit('existing-users', existingUsers);

        // Notify others in the room (not the sender)
        socket.to(roomId).emit('user-joined', {
            odId: socket.id,
            userName: userName
        });
    });

    // Handle user leaving the room
    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        socketRooms.delete(socket.id);

        // Remove from room users
        if (roomUsers.has(roomId)) {
            roomUsers.get(roomId).delete(socket.id);
        }

        // Notify others in the room (not the sender)
        socket.to(roomId).emit('user-left', socket.id);

        // If owner leaves, clear the room ownership
        if (roomOwners.get(roomId) === socket.id) {
            roomOwners.delete(roomId);
        }
    });

    // Handle disconnection events
    socket.on('disconnect', () => {
        // Get the room this socket was in
        const roomId = socketRooms.get(socket.id);

        if (roomId) {
            // Notify others in the room that this user has left
            socket.to(roomId).emit('user-left', socket.id);
            socketRooms.delete(socket.id);

            // Remove from room users
            if (roomUsers.has(roomId)) {
                roomUsers.get(roomId).delete(socket.id);
            }

            // If owner leaves, clear the room ownership
            if (roomOwners.get(roomId) === socket.id) {
                roomOwners.delete(roomId);
            }
        }
    });

    // Relay the offer to the other peer in the room
    socket.on('offer', (data) => {
        io.to(data.targetId).emit('offer', {
            offer: data.offer,
            senderId: socket.id,
            senderName: data.senderName
        });
    });

    // Relay answer to the other peer in the room
    socket.on('answer', (data) => {
        io.to(data.targetId).emit('answer', {
            answer: data.answer,
            senderId: socket.id
        });
    });

    // Relay ICE candidate to the other peer in the room
    socket.on('ice-candidate', (data) => {
        io.to(data.targetId).emit('ice-candidate', {
            candidate: data.candidate,
            senderId: socket.id
        });
    });
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
