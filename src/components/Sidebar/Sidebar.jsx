import { NavLink } from 'react-router-dom';
import { Video, Home, Calendar, Users, MessageSquare, Settings, HelpCircle } from 'lucide-react';
import Logo from '../Logo/Logo';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo-container">
        <Logo size="small" className="logo-white-mode" />
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/app" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Home size={20} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/app/meetings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Video size={20} />
          <span>Meetings</span>
        </NavLink>
        <NavLink to="/app/calendar" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Calendar size={20} />
          <span>Calendar</span>
        </NavLink>
        <NavLink to="/app/contacts" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          <span>Contacts</span>
        </NavLink>
        <NavLink to="/app/messages" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <MessageSquare size={20} />
          <span>Messages</span>
        </NavLink>
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
      </div>
    </aside>
  );
};

export default Sidebar;
