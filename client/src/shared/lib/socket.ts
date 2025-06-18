import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'; // Ensure backend URL is correct

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false, // Connect manually when needed, e.g., when a user enters a board
  // transports: ['websocket'], // Optional: force websocket transport
});

// Optional: Add logging for socket events for debugging
socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

// Function to join a project room
export const joinProjectRoom = (projectId: string) => {
  if (socket.connected) {
    socket.emit('joinProjectRoom', projectId);
    console.log(`Attempted to join project room: ${projectId}`);
  } else {
    console.warn('Socket not connected, cannot join room. Attempting to connect...');
    // Attempt to connect if not connected, then join
    socket.connect();
    socket.once('connect', () => {
        console.log('Socket reconnected, joining room:', projectId);
        socket.emit('joinProjectRoom', projectId);
    });
  }
};

// Function to leave a project room
export const leaveProjectRoom = (projectId: string) => {
  if (socket.connected) {
    socket.emit('leaveProjectRoom', projectId);
    console.log(`Attempted to leave project room: ${projectId}`);
  } else {
    console.warn('Socket not connected, cannot leave room.');
  }
};
