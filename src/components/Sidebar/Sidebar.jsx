import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, MessageSquare, Settings, HelpCircle, Phone, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo-container">
        {/* Logo removed */}
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/app" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Home size={20} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/app/contacts" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          <span>Contacts</span>
        </NavLink>
        <NavLink to="/app/calls" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Phone size={20} />
          <span>Calls</span>
        </NavLink>
        <NavLink to="/app/messages" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <MessageSquare size={20} />
          <span>Messages</span>
        </NavLink>
        <button type="button" className="sidebar-link sidebar-logout mobile-logout" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </nav>

      <div className="sidebar-bottom">
        <NavLink to="/app/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
        <NavLink to="/app/support" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <HelpCircle size={20} />
          <span>Help & Support</span>
        </NavLink>
        <button type="button" className="sidebar-link sidebar-logout" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
