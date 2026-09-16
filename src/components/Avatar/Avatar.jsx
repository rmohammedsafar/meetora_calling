import React from 'react';
import './Avatar.css';

const Avatar = ({ src, alt = "Avatar", size = 'medium', name }) => {
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className={`avatar avatar-${size}`}>
      {src ? (
        <img src={src} alt={alt} className="avatar-img" />
      ) : (
        <div className="avatar-initials">{getInitials(name)}</div>
      )}
    </div>
  );
};

export default Avatar;
