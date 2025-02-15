import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import './App.css';

// WebRTC configuration
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { 
      urls: 'turn:numb.viagenie.ca',
      credential: 'muazkh',
      username: 'webrtc@live.com'
    }
  ]
};

// Socket.io connection
let socket;
const App = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socket = io('https://192.168.196.89:3001');
    
    socket.on('connect', () => {
      console.log('Connected to signaling server');
      setIsConnected(true);
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
      setIsConnected(false);
    });
    
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  if (!isConnected) {
    return <div>Connecting to signaling server...</div>;
  }

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/call/:userId" element={<CallScreen />} />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
};

const Login = () => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const userId = Math.random().toString(36).substr(2, 9);
    const userInfo = { id: userId, username };
    
    // Register user with signaling server
    socket.emit('register', userInfo, (success) => {
      if (success) {
        localStorage.setItem('user', JSON.stringify(userInfo));
        navigate('/dashboard');
      } else {
        alert('Login failed. Please try again.');
        setIsLoading(false);
      }
    });
  };
  
  return (
    <div className="login-container">
      <h1>Voice Call App</h1>
      <form onSubmit={handleLogin}>
        <input 
          type="text" 
          placeholder="Enter username" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

const Dashboard = () => {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Get current user
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    
    const user = JSON.parse(userStr);
    setCurrentUser(user);
    
    // Listen for online users updates
    socket.emit('getOnlineUsers');
    socket.on('onlineUsers', (onlineUsers) => {
      // Filter out current user
      setUsers(onlineUsers.filter(u => u.id !== user.id));
    });
    
    // Listen for incoming call requests
    socket.on('incomingCall', (caller) => {
        navigate(`/call/${caller.id}`);
    });
    
    // Handle call rejected
    socket.on('callRejected', (rejector) => {
      alert(`${rejector.username} rejected your call.`);
    });
    
    return () => {
      socket.off('onlineUsers');
      socket.off('incomingCall');
      socket.off('callRejected');
    };
  }, [navigate]);
  
  const handleLogout = () => {
    socket.emit('logout');
    localStorage.removeItem('user');
    navigate('/login');
  };
  
  if (!currentUser) return <div>Loading...</div>;
  
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome, {currentUser.username} {currentUser.userId}</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>
      
      <div className="users-container">
        <h2>Online Users</h2>
        <ul className="users-list">
          {users.map(user => (
            <li key={user.id} className="user-item online">
              <span className="user-name">{user.username}</span>
              <span className="user-status">online</span>
              <button 
                onClick={() => {
                  socket.emit('initiateCall', { calleeId: user.id });
                  navigate(`/call/${user.id}`);
                }} 
                className="call-button"
              >
                Call
              </button>
            </li>
          ))}
          {users.length === 0 && <li>No users online</li>}
        </ul>
      </div>
    </div>
  );
};

const CallScreen = () => {
  const { userId: remoteUserId } = useParams();
  const [callStatus, setCallStatus] = useState('connecting');
  const [remoteUser, setRemoteUser] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const navigate = useNavigate();
  
  // References for WebRTC connection
  const peerConnection = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  useEffect(() => {
    // Get current user
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    
    const currentUser = JSON.parse(userStr);
    
    // Get remote user info
    socket.emit('getUserInfo', remoteUserId, (user) => {
      if (user) {
        setRemoteUser(user);
      } else {
        alert('User not found');
        navigate('/dashboard');
      }
    });
    
    // Initialize WebRTC
    peerConnection.current = new RTCPeerConnection(configuration);
    
    // Request access to microphone
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        setLocalStream(stream);
        
        // Add local stream to peer connection
        stream.getTracks().forEach(track => {
          peerConnection.current.addTrack(track, stream);
        });
        
        // Set up event handlers for the peer connection
        peerConnection.current.ontrack = (event) => {
          // When we receive remote stream
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };
        
        peerConnection.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('iceCandidate', {
              to: remoteUserId,
              candidate: event.candidate
            });
          }
        };
        
        peerConnection.current.oniceconnectionstatechange = () => {
          if (peerConnection.current.iceConnectionState === 'connected' || 
              peerConnection.current.iceConnectionState === 'completed') {
            setCallStatus('active');
          }
        };
        
        // Handle signaling
        if (window.location.pathname === `/call/${remoteUserId}`) {
          peerConnection.current.createOffer()
            .then(offer => peerConnection.current.setLocalDescription(offer))
            .then(() => {
              socket.emit('offer', {
                to: remoteUserId,
                offer: peerConnection.current.localDescription
              });
              setCallStatus('ringing');
            })
            .catch(err => {
              console.error('Error creating offer:', err);
              navigate('/dashboard');
            });
        }
      })
      .catch(err => {
        console.error('Error accessing microphone:', err);
        alert('Failed to access microphone. Please check permissions.');
        navigate('/dashboard');
      });
    
    // Set up socket events for signaling
    socket.on('offer', async ({ from, offer }) => {
      if (from === remoteUserId) {
        try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
          
          socket.emit('answer', {
            to: remoteUserId,
            answer: peerConnection.current.localDescription
          });
          
          setCallStatus('ringing');
        } catch (err) {
          console.error('Error handling offer:', err);
          navigate('/dashboard');
        }
      }
    });
    
    socket.on('answer', ({ from, answer }) => {
      if (from === remoteUserId) {
        peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer))
          .catch(err => {
            console.error('Error setting remote description:', err);
          });
      }
    });
    
    socket.on('iceCandidate', ({ from, candidate }) => {
      if (from === remoteUserId) {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(err => {
            console.error('Error adding ICE candidate:', err);
          });
      }
    });
    
    socket.on('callEnded', () => {
      handleEndCall();
    });
    
    return () => {
      // Clean up
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      
      socket.off('offer');
      socket.off('answer');
      socket.off('iceCandidate');
      socket.off('callEnded');
    };
  }, [remoteUserId, navigate]);
  
  const handleEndCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    
    socket.emit('endCall', { to: remoteUserId });
    setCallStatus('ended');
    setTimeout(() => navigate('/dashboard'), 1000);
  };
  
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };
  
  return (
    <div className="call-container">
      <div className="call-header">
        {remoteUser && <h2>Call with {remoteUser.username}</h2>}
        <div className="call-status">{callStatus}</div>
      </div>
      
      <div className="call-controls">
        <button onClick={toggleMute}>
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
        <button onClick={handleEndCall} className="end-call-button">
          End Call
        </button>
      </div>
      
      {callStatus === 'active' && (
        <div className="audio-indicators">
          <div className="audio-indicator local-audio">
            Local Audio Active
          </div>
          <div className="audio-indicator remote-audio">
            Remote Audio Active
          </div>
        </div>
      )}
      
      {/* We use audio elements instead of video since this is voice-only */}
      <audio ref={localVideoRef} muted style={{display: 'none'}} />
      <audio ref={remoteVideoRef} autoPlay style={{display: 'none'}} />
    </div>
  );
};

const AppCSS = `
.app-container {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

/* Login styles */
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
}

.login-container form {
  display: flex;
  flex-direction: column;
  width: 300px;
}

.login-container input {
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.login-container button {
  padding: 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.login-container button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

/* Dashboard styles */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.users-list {
  list-style: none;
  padding: 0;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 4px;
  background-color: #f5f5f5;
}

.user-item.online {
  border-left: 5px solid #4CAF50;
}

.user-item.offline {
  border-left: 5px solid #ccc;
  opacity: 0.7;
}

.user-name {
  flex: 1;
  font-weight: bold;
}

.user-status {
  margin: 0 10px;
  color: #666;
}

.call-button {
  padding: 5px 10px;
  background-color: #2196F3;
  color: white;
  text-decoration: none;
  border-radius: 4px;
}

/* Call screen styles */
.call-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.call-header {
  margin-bottom: 30px;
  text-align: center;
}

.call-status {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
}

.call-controls {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
}

.call-controls button {
  padding: 10px 20px;
  border: none;
  border-radius: 50px;
  cursor: pointer;
}

.end-call-button {
  background-color: #f44336;
  color: white;
}

.audio-indicators {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.audio-indicator {
  padding: 10px;
  border-radius: 4px;
  text-align: center;
}

.local-audio {
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
}

.remote-audio {
  background-color: #f6ffed;
  border: 1px solid #b7eb8f;
}
`;

export default App;