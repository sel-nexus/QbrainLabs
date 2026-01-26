import { io } from 'socket.io-client';

// Auto-detect socket URL based on current hostname for network access
const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // If accessing via IP, use the same IP for socket
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:8000`;
  }
  return 'http://localhost:8000';
};

const SOCKET_URL = getSocketUrl();

export const socket = io(SOCKET_URL, {
    path: '/ws/socket.io',
    autoConnect: false, // We connect manually after join
    transports: ['websocket']
});
