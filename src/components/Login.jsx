import React, { useState } from 'react';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    
    const userData = {
      id: Date.now().toString(),
      username: username.trim(),
      joinedAt: new Date().toISOString()
    };
    
    onLogin(userData);
  };

  return (
    <div className="login-container">
      <h1>Join the Chat</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter a username"
            required
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn-primary">Join Chat</button>
      </form>
    </div>
  );
}

export default Login;