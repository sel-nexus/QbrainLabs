import { io } from 'socket.io-client';

import { API_BASE_URL } from './config';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;

export const socket = io(SOCKET_URL, {
  path: '/ws/socket.io',
  autoConnect: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  // Keep retrying for the whole session: venue Wi-Fi drops are common in
  // live workshops and giving up after a few attempts strands participants.
  reconnectionAttempts: Infinity,
  timeout: 20000
});
