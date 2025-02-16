// server.js
const express = require('express');
const http = require('https');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require("fs")

const app = express();
app.use(cors());

const options = {
  key: fs.readFileSync("../ssl/key.pem"),
  cert: fs.readFileSync("../ssl/cert.pem"),
}

const server = http.createServer(options, app);

const io = socketIo(server, {
  cors: {
    origin: "*", // In production, specify your React app's address
    methods: ["GET", "POST"]
  }
});

// Store connected users
const users = new Map();

io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Handle user joining
  socket.on('join', (userData) => {
    // Store user in our map with socket id as key
    users.set(socket.id, userData);
    
    // Broadcast updated user list to all clients
    io.emit('users', Array.from(users.values()));
    
    // Send system message about new user
    io.emit('message', {
      id: Date.now().toString(),
      userId: 'system',
      username: 'System',
      text: `${userData.username} has joined the chat`,
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle new messages
  socket.on('send-message', (message) => {
    io.emit('message', message);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    const userData = users.get(socket.id);
    if (userData) {
      // Remove user from our map
      users.delete(socket.id);
      
      // Broadcast updated user list
      io.emit('users', Array.from(users.values()));
      
      // Send system message about user leaving
      io.emit('message', {
        id: Date.now().toString(),
        userId: 'system',
        username: 'System',
        text: `${userData.username} has left the chat`,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('Client disconnected');
  });
});

// Default route
app.get('/', (req, res) => {
  res.send('WebSocket server for Local Network Chat');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});