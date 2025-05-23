// /client/src/pages/Login.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      console.log('Returned user:', data.user); // ✅ Debug log

      if (response.ok && data.user && data.token) {
        const userWithToken = {
          ...data.user,
          token: data.token,
          setupComplete: data.user.setupComplete || false
        };

        const oneHour = 60 * 60 * 1000;
        userWithToken.tokenExpiry = Date.now() + oneHour;
        localStorage.setItem('user', JSON.stringify(userWithToken));
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.user.role);
        localStorage.setItem('firstName', data.user.firstName || '');
        localStorage.setItem('lastName', data.user.lastName || '');
        localStorage.setItem('organization', data.user.organization || '');
        localStorage.setItem('orgId', data.user.orgId || '');

        toast.success('Login successful!');

        setTimeout(async () => {
          const clientRoles = ['client_admin', 'client_editor', 'client_viewer'];
          const platformRoles = ['platform_editor', 'platform_viewer'];

          if (data.user.role === 'admin') {
            navigate('/admin');
          } else if (clientRoles.includes(data.user.role)) {
            try {
              const statusRes = await fetch('/api/integrations/greenhouse/status', {
                headers: { Authorization: `Bearer ${data.token}` }
              });
              const status = await statusRes.json();

              const redirectToSetup = !status.connected && data.user.role === 'client_admin';
              navigate(redirectToSetup ? '/client/integrations/greenhouse' : '/client');
            } catch (err) {
              console.warn('Failed to check integration status, defaulting to /client', err);
              navigate('/client');
            }
          } else if (platformRoles.includes(data.user.role)) {
            navigate('/admin');
          } else {
            toast.error('Unknown role');
          }
        }, 1000);
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto' }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        <button type="submit" style={{ padding: '10px', width: '100%' }}>
          Login
        </button>
      </form>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

export default Login;
