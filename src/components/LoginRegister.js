import React, { useState } from 'react';

import './LoginRegister.css';
import USMapBackground from './USMapBackground';

const LoginRegister = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      setError('Please fill in all fields.');
      return;
    }
    // Dummy auth logic
    onAuth(normalizedUsername);
  };

  // Reset fields when switching between login/register
  const handleToggle = (loginMode) => {
    setIsLogin(loginMode);
    setUsername('');
    setPassword('');
    setError('');
  };

  return (
    <div className="login-register-modal">
      <USMapBackground />
      <div className="login-register-box">
        <h2>{isLogin ? 'Login' : 'Register'}</h2>
        <form onSubmit={handleSubmit} autoComplete="off">
          <input
            id={isLogin ? 'login-username' : 'register-username'}
            name="username"
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
          />
          <input
            id={isLogin ? 'login-password' : 'register-password'}
            name="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
          {error && <div className="error">{error}</div>}
          <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
        </form>
        <div className="toggle-link">
          {isLogin ? (
            <span>Don't have an account? <button type="button" onClick={() => handleToggle(false)}>Register</button></span>
          ) : (
            <span>Already have an account? <button type="button" onClick={() => handleToggle(true)}>Login</button></span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginRegister;
