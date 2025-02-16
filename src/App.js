import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import ChatRoom from './components/ChatRoom';
import { initializeSocket } from './utils/socketService';

function App() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const savedUser = localStorage.getItem('chatUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      initializeSocket();
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('chatUser', JSON.stringify(userData));
    initializeSocket();
  };

  const handleLogout = () => {
    localStorage.removeItem('chatUser');
    setUser(null);
  };

  return (
    <div className="App">
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <ChatRoom user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
