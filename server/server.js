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

const users = new Map();
const messages = new Map()

io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('join', (userData) => {
    users.set(socket.id, userData);
    
    io.emit('users', Array.from(users.values()));
    
    io.emit('message', {
      id: Date.now().toString(),
      userId: 'system',
      username: 'System',
      text: `${userData.username} has joined the chat`,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('send-message', (message) => {
    io.emit('message', message);
  });
  
  socket.on('disconnect', () => {
    const userData = users.get(socket.id);
    if (userData) {
      users.delete(socket.id);
      io.emit('users', Array.from(users.values()));
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

  socket.on('logout', () => {
    const userData = users.get(socket.id);
    if (userData) {
      users.delete(socket.id);
      io.emit('users', Array.from(users.values()));
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

app.get('/', (req, res) => {
  res.send('WebSocket server for Local Network Chat');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});