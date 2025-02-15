const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store online users
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Handle user registration
  socket.on('register', (user, callback) => {
    console.log('User registered:', user);
    user.socketId = socket.id;
    onlineUsers.set(user.id, user);
    socket.userId = user.id;
    callback(true);
    
    // Broadcast updated online users list
    io.emit('onlineUsers', Array.from(onlineUsers.values()));
  });
  
  // Get online users
  socket.on('getOnlineUsers', () => {
    socket.emit('onlineUsers', Array.from(onlineUsers.values()));
  });
  
  // Get user info
  socket.on('getUserInfo', (userId, callback) => {
    const user = onlineUsers.get(userId);
    callback(user || null);
  });
  
  // Handle logout
  socket.on('logout', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('onlineUsers', Array.from(onlineUsers.values()));
    }
  });
  
  // Handle call initiation
  socket.on('initiateCall', ({ calleeId }) => {
    const caller = onlineUsers.get(socket.userId);
    const callee = onlineUsers.get(calleeId);
    
    if (callee) {
      io.to(callee.socketId).emit('incomingCall', caller);
    }
  });
  
  // Handle call rejection
  socket.on('rejectCall', ({ callerId, userId }) => {
    const caller = onlineUsers.get(callerId);
    const rejector = onlineUsers.get(userId);
    
    if (caller) {
      io.to(caller.socketId).emit('callRejected', rejector);
    }
  });
  
  // WebRTC signaling
  socket.on('offer', ({ to, offer }) => {
    const toUser = onlineUsers.get(to);
    if (toUser) {
      io.to(toUser.socketId).emit('offer', {
        from: socket.userId,
        offer
      });
    }
  });
  
  socket.on('answer', ({ to, answer }) => {
    const toUser = onlineUsers.get(to);
    if (toUser) {
      io.to(toUser.socketId).emit('answer', {
        from: socket.userId,
        answer
      });
    }
  });
  
  socket.on('iceCandidate', ({ to, candidate }) => {
    const toUser = onlineUsers.get(to);
    if (toUser) {
      io.to(toUser.socketId).emit('iceCandidate', {
        from: socket.userId,
        candidate
      });
    }
  });
  
  socket.on('endCall', ({ to }) => {
    const toUser = onlineUsers.get(to);
    if (toUser) {
      io.to(toUser.socketId).emit('callEnded');
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('onlineUsers', Array.from(onlineUsers.values()));
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Signaling server running on port ${PORT}`);
});