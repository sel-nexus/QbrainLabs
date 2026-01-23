import { io } from 'socket.io-client';

// For local dev, socket.io is mounted at /ws on port 8000
// But standard socket.io client defaults to connecting to host:port
// We need to tell it to look at localhost:8000 with path /ws/socket.io

export const socket = io('http://localhost:8000', {
    path: '/ws/socket.io',
    autoConnect: false, // We connect manually after join
    transports: ['websocket']
});
