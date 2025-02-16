import React, { useState, useEffect } from 'react';
import Header from './Header';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { getSocket } from '../utils/socketService';
import { showNotification } from '../utils/notificationService';

function ChatRoom({ user, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [showUsers, setShowUsers] = useState(false);
  const socket = getSocket();
  const [lastNotifiedUser, setLastNotifiedUser] = useState(null);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('message', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
      
      // Show notification if the window is not focused and message is not from current user
      // and not the same user as the last notification
      if (document.hidden && 
          message.userId !== user.id && 
          message.userId !== 'system' &&
          message.userId !== lastNotifiedUser) {
        showNotification(message.username, message.text);
        setLastNotifiedUser(message.userId);
      }
    });
    
    // Listen for user list updates
    socket.on('users', (userList) => {
      setUsers(userList);
    });
    
    // Cleanup
    return () => {
      socket.off('message');
      socket.off('users');
    };
  }, [user.id, socket, lastNotifiedUser]);

  // Reset last notified user when window gets focus
  useEffect(() => {
    const handleFocus = () => {
      setLastNotifiedUser(null);
    };
    
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const sendMessage = (text) => {
    if (!socket) return;
    
    const message = {
      id: Date.now().toString(),
      userId: user.id,
      username: user.username,
      text,
      timestamp: new Date().toISOString()
    };
    
    socket.emit('send-message', message);
  };

  const toggleUsers = () => {
    setShowUsers(!showUsers);
  };

  return (
    <div className={`chat-container ${showUsers ? 'show-users' : ''}`}>
      <Header 
        username={user.username} 
        onLogout={onLogout} 
        userCount={users.length}
        onToggleUsers={toggleUsers}
      />
      <div className="chat-main">
        <div className="user-list">
          <h3>Online Users ({users.length})</h3>
          <ul>
            {users.map((u) => (
              <li key={u.id} className={u.id === user.id ? 'current-user' : ''}>
                {u.username}
                {u.id === user.id && ' (you)'}
              </li>
            ))}
          </ul>
        </div>
        <div className="message-area" onClick={() => showUsers && setShowUsers(false)}>
          <MessageList messages={messages} currentUserId={user.id} />
          <MessageInput onSendMessage={sendMessage} />
        </div>
      </div>
    </div>
  );
}

export default ChatRoom;