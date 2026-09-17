import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage/LandingPage';
import LoginPage from './pages/LoginPage/LoginPage';
import AppLayout from './layouts/AppLayout/AppLayout';
import HomeDashboard from './pages/HomeDashboard/HomeDashboard';
import CalendarPage from './pages/CalendarPage/CalendarPage';
import MessagesPage from './pages/MessagesPage/MessagesPage';
import ContactsPage from './pages/ContactsPage/ContactsPage';
import RecentCallsPage from './pages/RecentCallsPage/RecentCallsPage';
import CallWidget from './components/CallWidget/CallWidget';

import { CallProvider } from './contexts/CallContext';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <CallProvider>
        <CallWidget />
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Authenticated App Routes */}
            <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<HomeDashboard />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="calls" element={<RecentCallsPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              {/* Placeholders for remaining app routes */}
              <Route path="meetings" element={<div>Meetings Page (To be implemented)</div>} />
              <Route path="settings" element={<div>Settings Page (To be implemented)</div>} />
              <Route path="support" element={<div>Support Page (To be implemented)</div>} />
            </Route>
          </Routes>
        </Router>
      </CallProvider>
    </AuthProvider>
  );
}

export default App;
