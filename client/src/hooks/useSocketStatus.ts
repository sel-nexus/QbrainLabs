import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';

export type SocketStatus = 'connected' | 'reconnecting' | 'connecting';

/** Live connection state of the shared Socket.IO client. */
export function useSocketStatus(): SocketStatus {
    const [status, setStatus] = useState<SocketStatus>(socket.connected ? 'connected' : 'connecting');

    useEffect(() => {
        let everConnected = socket.connected;
        const onConnect = () => {
            everConnected = true;
            setStatus('connected');
        };
        const onDisconnect = (reason?: string) => {
            // A deliberate disconnect (participant left) is not a lost connection.
            if (reason === 'io client disconnect') {
                everConnected = false;
                setStatus('connecting');
                return;
            }
            setStatus(everConnected ? 'reconnecting' : 'connecting');
        };
        const onReconnectAttempt = () => setStatus(everConnected ? 'reconnecting' : 'connecting');
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.io.on('reconnect_attempt', onReconnectAttempt);
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.io.off('reconnect_attempt', onReconnectAttempt);
        };
    }, []);

    return status;
}
