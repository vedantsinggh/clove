import React, { useRef, useEffect } from 'react';

function MessageList({ messages, currentUserId }) {
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="message-list">
      {messages.map((message) => (
        <div 
          key={message.id} 
          className={`message ${message.userId === currentUserId ? 'own-message' : message.username === "System" ? ( message.text.includes("left") ? "left" : "system"): 'other-message'}`}
        >
          <div className="message-header">
            <span className="username">{message.userId === currentUserId ? 'You' : message.username}</span>
            <span className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</span>
          </div>
          <p className="message-text">{message.text}</p>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;