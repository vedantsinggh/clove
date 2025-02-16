import io from 'socket.io-client';

// This should be the IP address of your server on the local network
const SERVER_URL = 'https://192.168.157.89:3001';

let socket = null;

export const initializeSocket = () => {
  if (!socket) {
    socket = io(SERVER_URL);
    
    // Send user information when connecting
    const user = JSON.parse(localStorage.getItem('chatUser'));
    if (user) {
      socket.emit('join', user);
    }
    
    // Handle reconnection
    socket.on('connect', () => {
      console.log('Connected to server');
      const user = JSON.parse(localStorage.getItem('chatUser'));
      if (user) {
        socket.emit('join', user);
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }
  
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};