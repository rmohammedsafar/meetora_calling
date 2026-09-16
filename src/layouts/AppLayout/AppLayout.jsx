import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/Sidebar/Sidebar';
import './AppLayout.css';

const AppLayout = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
