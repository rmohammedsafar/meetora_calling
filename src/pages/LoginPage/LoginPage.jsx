import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, MessageSquare, Video, Globe, EyeOff, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { signup, loginWithGoogle, currentUser } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  if (currentUser) {
    navigate('/app');
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    
    try {
      setError('');
      setLoading(true);
      await signup(email, password, fullName);
      navigate('/app');
    } catch (err) {
      setError('Failed to create an account: ' + err.message);
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      navigate('/app');
    } catch (err) {
      setError('Failed to log in with Google: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="signup-page">
      {/* Left Column - Visual Brand */}
      <div className="signup-left">
        {/* Background Waves */}
        <div className="background-waves">
          <svg viewBox="0 0 800 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 400 C 200 300, 400 500, 800 300 L 800 1000 L 0 1000 Z" fill="rgba(255,255,255,0.02)" />
            <path d="M0 600 C 300 500, 500 700, 800 500 L 800 1000 L 0 1000 Z" fill="rgba(255,255,255,0.03)" />
          </svg>
        </div>

        <div className="signup-left-content">
          <div className="brand-header">
            <div className="brand-logo-m">
              <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 80 L35 40 L50 70 L65 40 L80 80" stroke="#3b82f6" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 80 L35 40 L50 70" stroke="#60a5fa" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="brand-name">Meetora</span>
          </div>

          <div className="hero-text-area">
            <h1>Bring people<br/><span className="text-highlight">closer</span></h1>
            <p>Meaningful conversations.<br/>Brighter ideas. A more connected<br/>tomorrow.</p>
          </div>

          {/* Connected Network Visual */}
          <div className="network-visual">
            <svg className="network-lines" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
              <circle cx="200" cy="200" r="160" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" strokeDasharray="4 4" />
              <path d="M 80 180 Q 200 200, 320 180" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" strokeDasharray="4 4" />
              <path d="M 200 80 Q 200 200, 200 320" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" strokeDasharray="4 4" />
            </svg>

            <div className="network-node avatar-node pos-center">
              <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200" alt="Center Avatar" />
              <div className="call-actions">
                <div className="call-btn btn-mic"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg></div>
                <div className="call-btn btn-video"><Video size={12} color="white" /></div>
                <div className="call-btn btn-end"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/></svg></div>
              </div>
            </div>

            <div className="network-node avatar-node pos-left">
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150" alt="Left Avatar" />
            </div>

            <div className="network-node avatar-node pos-right-top">
              <img src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=150" alt="Right Top Avatar" />
            </div>

            <div className="network-node avatar-node pos-right-bottom">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150" alt="Right Bottom Avatar" />
            </div>

            <div className="network-node icon-node pos-icon-top">
              <Users size={16} color="white" />
            </div>

            <div className="network-node icon-node pos-icon-right">
              <Video size={16} color="white" />
            </div>

            <div className="network-node icon-node pos-icon-left">
              <MessageSquare size={16} color="white" />
            </div>

            <div className="network-node icon-node pos-icon-bottom">
              <Globe size={16} color="white" />
            </div>
          </div>

          <div className="footer-tags">
            <span>PEOPLE</span> • <span>IDEAS</span> • <span>OPPORTUNITIES</span> • <span>TOGETHER</span>
          </div>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="signup-right">
        <div className="form-container">
          <div className="form-header">
            <h2>Create your account</h2>
            <p>Join Meetora and be part of a more connected world.</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-group">
              <label>Full name</label>
              <input 
                type="text" 
                placeholder="Enter your full name" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Email address</label>
              <input 
                type="email" 
                placeholder="you@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Create a password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
                <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm password</label>
              <div className="password-input-wrapper">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder="Confirm your password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required 
                />
                <button type="button" className="toggle-password" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <div className="terms-checkbox">
              <input type="checkbox" id="terms" required />
              <label htmlFor="terms">I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></label>
            </div>

            <button type="submit" className="btn-create-account" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account \u2192'}
            </button>
          </form>

          <div className="divider">
            <span>or continue with</span>
          </div>

          <div className="oauth-buttons">
            <button type="button" className="btn-oauth" onClick={handleGoogleLogin} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button type="button" className="btn-oauth">
              <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
              Continue with Microsoft
            </button>
          </div>

          <div className="login-prompt">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
