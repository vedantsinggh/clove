import React from 'react';

function Header({ username, onLogout, userCount, onToggleUsers }) {
  return (
    <header className="chat-header">
      <div className="header-left">
        <h1>Clove</h1>
        <span className="user-count">{userCount} online</span>
        <button className="toggle-users" onClick={onToggleUsers}>
          Users
        </button>
      </div>
      <div className="header-right">
        <span className="current-user">Logged in as {username}</span>
        <button onClick={onLogout} className="btn-logout">Logout</button>
      </div>
    </header>
  );
}

export default Header;
