import { io } from 'socket.io-client';

// For local dev, socket.io is mounted at /ws on port 8000
// But standard socket.io client defaults to connecting to host:port
// We need to tell it to look at localhost:8000 with path /ws/socket.io
// In production, use VITE_API_URL or VITE_SOCKET_URL environment variable

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const socket = io(SOCKET_URL, {
    path: '/ws/socket.io',
    autoConnect: false, // We connect manually after join
    transports: ['websocket']
});
