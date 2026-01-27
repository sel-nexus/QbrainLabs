import { io } from 'socket.io-client';

import { API_BASE_URL } from './config';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;

export const socket = io(SOCKET_URL, {
  path: '/ws/socket.io',
  autoConnect: false, // We connect manually after join
  transports: ['websocket']
});
