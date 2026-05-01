import React, { useState } from 'react';
import './Auth.css';
import API_BASE_URL from '../../config';

const Auth = ({ onLogin }) => {
  const [mode, setMode] = useState('register'); // 'register' | 'login' | 'admin'
  const [name, setName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [generatedId, setGeneratedId] = useState(null);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, roomCode: roomCode.toUpperCase() })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedId(data.user.uniqueId);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Server error.');
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomCode: roomCode.toUpperCase(), 
          adminName: name 
        })
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.admin);
      } else {
        setError(data.error || 'Room creation failed');
      }
    } catch (err) {
      setError('Server error.');
    }
  };

  const handleLogin = async (e, directId = null) => {
    e.preventDefault();
    setError('');
    const idToUse = directId || loginId;
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniqueId: idToUse })
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.error || 'Login failed. Invalid ID.');
      }
    } catch (err) {
      setError('Server error.');
    }
  };

  if (generatedId) {
    return (
      <div className="auth-container">
        <div className="auth-box success-box">
          <h2>REGISTRATION SUCCESSFUL</h2>
          <p>Welcome, Operator {name}.</p>
          <div className="unique-id-display">
            <span>YOUR ACCESS ID:</span>
            <h1>{generatedId}</h1>
          </div>
          <p className="warning-text">MEMORIZE THIS ID. YOU WILL NEED IT TO JOIN ROOM {roomCode}.</p>
          <button className="auth-btn" onClick={() => handleLogin({ preventDefault: () => {} }, generatedId)}>INITIALIZE SYSTEM</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>
          {mode === 'register' ? 'OPERATOR ENLISTMENT' : 
           mode === 'login' ? 'SYSTEM LOGIN' : 'ADMIN CONTROL CENTER'}
        </h2>
        
        {error && <div className="auth-error">{error}</div>}

        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>OPERATOR ALIAS:</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Name" />
            </div>
            <div className="form-group">
              <label>ROOM CODE:</label>
              <input type="text" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} required placeholder="Ex: ZOMBIE-99" />
            </div>
            <button type="submit" className="auth-btn">JOIN GAME</button>
          </form>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>ACCESS ID:</label>
              <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} required placeholder="6-Digit ID" />
            </div>
            <button type="submit" className="auth-btn">LOGIN</button>
          </form>
        )}

        {mode === 'admin' && (
          <form onSubmit={handleCreateRoom}>
            <div className="form-group">
              <label>ADMIN NAME:</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Admin Name" />
            </div>
            <div className="form-group">
              <label>ROOM CODE (Leave blank for random):</label>
              <input type="text" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} placeholder="Ex: MY-CTF" />
            </div>
            <button type="submit" className="auth-btn">CREATE SECURE ROOM</button>
          </form>
        )}

        <div className="auth-switch">
          {mode !== 'register' && <button className="switch-btn" onClick={() => setMode('register')}>JOIN AS PLAYER</button>}
          {mode !== 'login' && <button className="switch-btn" onClick={() => setMode('login')}>LOGIN WITH ID</button>}
          {mode !== 'admin' && <button className="switch-btn" onClick={() => setMode('admin')}>CREATE ROOM (ADMIN)</button>}
        </div>
      </div>
    </div>
  );
};

export default Auth;
