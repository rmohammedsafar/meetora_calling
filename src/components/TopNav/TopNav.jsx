import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../Button/Button';
import Logo from '../Logo/Logo';
import './TopNav.css';

const TopNav = () => {
  return (
    <nav className="topnav-container">
      <div className="topnav-content">
        <Link to="/" className="topnav-logo-link">
          <Logo size="medium" />
        </Link>
        
        <ul className="topnav-links">
          <li><Link to="#">Product</Link></li>
          <li><Link to="#">Solutions</Link></li>
          <li><Link to="#">Pricing</Link></li>
          <li><Link to="#">Resources</Link></li>
        </ul>

        <div className="topnav-actions">
          <Link to="/login" className="topnav-signin">Sign in</Link>
          <Button variant="primary" size="medium" onClick={() => window.location.href='/login'}>
            Start for free
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
