const fs = require('fs');
const path = require('path');

const appLayoutCss = `
@media (max-width: 768px) {
  .app-main {
    margin-left: 0 !important;
    padding: 16px !important;
    margin-bottom: 70px !important; 
  }
}
`;

const sidebarCss = `
@media (max-width: 768px) {
  .sidebar {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    top: auto !important;
    width: 100% !important;
    height: 70px !important;
    flex-direction: row !important;
    padding: 0 16px !important;
    border-right: none !important;
    border-top: 1px solid #1e293b !important;
    z-index: 100 !important;
  }
  .sidebar-logo { display: none !important; }
  .sidebar-nav {
    flex-direction: row !important;
    justify-content: space-around !important;
    width: 100% !important;
    align-items: center !important;
  }
  .sidebar-link {
    flex-direction: column !important;
    font-size: 10px !important;
    padding: 8px !important;
    gap: 4px !important;
  }
  .sidebar-bottom { display: none !important; }
}
`;

const topNavCss = `
@media (max-width: 768px) {
  .topnav-search { display: none !important; }
  .topnav { padding: 12px 16px !important; }
}
`;

const homeDashboardCss = `
@media (max-width: 768px) {
  .dashboard-grid, .stats-grid {
    grid-template-columns: 1fr !important;
  }
  .welcome-section h1 {
    font-size: 24px !important;
  }
}
`;

const meetingRoomCss = `
@media (max-width: 768px) {
  .room-main {
    flex-direction: column !important;
    overflow-y: auto !important;
  }
  .video-grid {
    grid-template-columns: 1fr !important;
    grid-template-rows: auto !important;
    gap: 8px !important;
  }
  .vact-video {
    height: 250px !important;
  }
  .room-panel {
    width: 100% !important;
    border-left: none !important;
    border-top: 1px solid #1e293b !important;
    flex: none !important;
    height: 400px !important;
  }
  .call-controls {
    flex-wrap: wrap !important;
    justify-content: center !important;
    padding: 12px !important;
    gap: 8px !important;
  }
  .controls-left, .controls-right { display: none !important; }
  .room-header { flex-wrap: wrap !important; gap: 12px !important; padding: 12px 16px !important;}
}
`;

const contactsCss = `
@media (max-width: 768px) {
  .contacts-page { padding: 16px !important; }
  .contact-card {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 16px !important;
  }
  .contact-actions {
    width: 100% !important;
  }
  .action-btn { width: 100% !important; justify-content: center !important; }
}
`;

const loginCss = `
@media (max-width: 768px) {
  .login-container { flex-direction: column !important; }
  .login-visual-panel { display: none !important; }
  .login-form-panel { padding: 24px 16px !important; justify-content: center !important;}
  .login-box { width: 100% !important; padding: 24px 16px !important; }
}
`;

const appendCSS = (file, content) => {
  const filePath = path.join(__dirname, 'src', file);
  if (fs.existsSync(filePath)) {
    fs.appendFileSync(filePath, '\n' + content);
    console.log('Appended to', file);
  } else {
    console.warn('File not found:', filePath);
  }
};

appendCSS('layouts/AppLayout/AppLayout.css', appLayoutCss);
appendCSS('components/Sidebar/Sidebar.css', sidebarCss);
appendCSS('components/TopNav/TopNav.css', topNavCss);
appendCSS('pages/HomeDashboard/HomeDashboard.css', homeDashboardCss);
appendCSS('pages/MeetingRoom/MeetingRoom.css', meetingRoomCss);
appendCSS('pages/ContactsPage/ContactsPage.css', contactsCss);
appendCSS('pages/LoginPage/LoginPage.css', loginCss);

console.log("Done adding responsiveness.");
