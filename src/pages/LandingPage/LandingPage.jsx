import React from 'react';
import TopNav from '../../components/TopNav/TopNav';
import Button from '../../components/Button/Button';
import { Video, Users, Monitor, PlayCircle, Mic, MicOff, Camera, MonitorUp } from 'lucide-react';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <TopNav />
      
      <main className="landing-main">
        <div className="landing-hero">
          <div className="hero-content">
            <h1 className="hero-title">
              Meet. Collaborate.<br />Belong.
            </h1>
            <p className="hero-subtitle">
              More than meetings — a place for brighter ideas, stronger teams, and a more connected tomorrow.
            </p>
            <div className="hero-cta">
              <Button variant="primary" size="large" onClick={() => window.location.href='/login'}>
                Start for free
              </Button>
              <Button variant="outline" size="large" onClick={() => window.location.href='/login'}>
                Sign in
              </Button>
            </div>
            
            <div className="hero-features">
              <div className="feature">
                <Video size={18} className="feature-icon" />
                <span>HD video meetings</span>
              </div>
              <div className="feature">
                <Users size={18} className="feature-icon" />
                <span>Real-time collaboration</span>
              </div>
              <div className="feature">
                <Monitor size={18} className="feature-icon" />
                <span>Built for everyone</span>
              </div>
            </div>
          </div>
          
          <div className="hero-visual">
            <div className="mockup-container">
              {/* Note: In a real app we'd use high quality images here. We'll simulate the grid layout */}
              <div className="mockup-grid">
                <div className="grid-item item-main">
                  <div className="participant-info">Sarah Chen</div>
                  <div className="tooltip">Good ideas bring people together.</div>
                </div>
                <div className="grid-item item-small item-1">
                  <div className="participant-info">Daniel Kim</div>
                </div>
                <div className="grid-item item-small item-2">
                  <div className="participant-info">Emma Wilson</div>
                </div>
                <div className="grid-item item-small item-3">
                  <div className="participant-info">Marcus Lee</div>
                </div>
              </div>
              
              <div className="mockup-controls">
                <div className="control-btn"><Mic size={18} /></div>
                <div className="control-btn"><Camera size={18} /></div>
                <div className="control-btn"><MonitorUp size={18} /></div>
                <div className="control-btn end-call"><Video size={18} /></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
