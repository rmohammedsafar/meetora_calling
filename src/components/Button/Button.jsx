import React from 'react';
import './Button.css';

const Button = ({ children, variant = 'primary', size = 'medium', className = '', ...props }) => {
  return (
    <button 
      className={`btn btn-${variant} btn-${size} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
