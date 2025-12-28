# Video Call App

A real-time video calling application built with WebRTC, Node.js, Express, and Socket.io.

## Features

- **Real-time Video Calls**: Peer-to-peer video communication using WebRTC
- **Group Calls**: Support for multiple participants in a single room
- **Room Management**: Create rooms or join existing ones
- **Join Request System**: Room owners can accept or reject join requests
- **Media Controls**: Mute/unmute microphone and toggle camera on/off
- **Dynamic UI**: Video containers are dynamically added/removed as users join/leave

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Real-time Communication | Socket.io |
| Video/Audio | WebRTC |
| STUN Servers | Google STUN servers |

## Project Structure

```
video-call-project/
├── server.js              # Express server with Socket.io signaling
├── package.json           # Node.js dependencies
├── public/
│   ├── index.html         # Home page (create/join room)
│   ├── room.html          # Video call room page
│   ├── css/
│   │   └── style.css      # Application styles
│   └── js/
│       ├── main.js        # Home page logic
│       └── room.js        # WebRTC and room logic
└── README.md
```

## How It Works

### WebRTC Flow

```
1. User A creates a room (becomes owner)
2. User B requests to join the room
3. User A accepts the request
4. User B joins and sends an "offer" to User A
5. User A responds with an "answer"
6. Both exchange ICE candidates to find the best network path
7. Direct peer-to-peer connection established
8. Video/audio streams flow directly between browsers
```

### Signaling Server

The Node.js server handles:
- Room creation and management
- Join request/accept/reject flow
- Relaying WebRTC signaling messages (offers, answers, ICE candidates)
- User connection/disconnection events

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd video-call-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   node server.js
   ```

4. **Open in browser**
   ```
   http://localhost:3001
   ```

## Usage

### Creating a Room
1. Enter your name
2. Click "Create New Room"
3. Share the Room ID with others

### Joining a Room
1. Enter your name
2. Enter the Room ID
3. Click "Join Room"
4. Wait for the room owner to accept your request

### During a Call
- **Mute**: Toggle your microphone
- **Turn Camera Off**: Toggle your camera
- **End Call**: Leave the room and return to home page

## Configuration

### Port
The server runs on port `3001` by default. You can change it by setting the `PORT` environment variable:

```bash
PORT=8080 node server.js
```

### STUN Servers
The app uses Google's public STUN servers. For production, consider adding TURN servers for better connectivity:

```javascript
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add TURN servers for production:
        // {
        //     urls: 'turn:your-turn-server.com:3478',
        //     username: 'user',
        //     credential: 'password'
        // }
    ]
};
```

## Browser Support

WebRTC is supported in:
- Chrome 28+
- Firefox 22+
- Safari 11+
- Edge 79+
- Opera 18+

## Limitations

- **No TURN server**: May not work across strict NAT/firewalls
- **No authentication**: Anyone with the room ID can request to join
- **No persistence**: Rooms are lost when the server restarts
- **Local network**: Best suited for local network or development use

## Future Improvements

- [ ] Add TURN server support for better connectivity
- [ ] Implement user authentication
- [ ] Add screen sharing functionality
- [ ] Add text chat alongside video
- [ ] Add recording capability
- [ ] Implement room persistence with a database
- [ ] Add end-to-end encryption

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Author

n00bface (Bishal Shrestha)
