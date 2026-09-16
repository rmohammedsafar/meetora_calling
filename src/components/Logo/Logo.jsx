import React from 'react';
import logoImage from '../../assets/logo.jpg';
import './Logo.css';

const Logo = ({ showText = true, className = '', size = 'medium' }) => {
  return (
    <div className={`meetora-logo ${size} ${className}`}>
      <img src={logoImage} alt="Meetora Logo" className="logo-image" />
    </div>
  );
};

export default Logo;
