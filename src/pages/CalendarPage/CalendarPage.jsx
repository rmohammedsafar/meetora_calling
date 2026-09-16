import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import Button from '../../components/Button/Button';
import './CalendarPage.css';

const CalendarPage = () => {
  return (
    <div className="calendar-page">
      {/* Header */}
      <header className="calendar-header">
        <div>
          <h1>Calendar</h1>
          <p className="calendar-subtitle">Plan, schedule, and manage your meetings.</p>
        </div>
        <Button variant="primary" size="medium">
          <CalendarIcon size={16} style={{marginRight: '8px'}} /> Schedule meeting
        </Button>
      </header>

      {/* Toolbar */}
      <div className="calendar-toolbar">
        <div className="toolbar-left">
          <button className="btn-today">Today</button>
          <div className="nav-arrows">
            <button className="nav-arrow"><ChevronLeft size={20} /></button>
            <button className="nav-arrow"><ChevronRight size={20} /></button>
          </div>
          <h2 className="current-month">April 2024</h2>
        </div>
        <div className="view-toggles">
          <button className="toggle-btn active">Week</button>
          <button className="toggle-btn">Month</button>
          <button className="toggle-btn">List</button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid-container">
        {/* Days Header */}
        <div className="calendar-days-header">
          <div className="time-col-header"></div>
          <div className="day-col">
            <span className="day-name">Mon</span>
            <span className="day-number">14</span>
          </div>
          <div className="day-col active">
            <span className="day-name">Tue</span>
            <span className="day-number">15</span>
          </div>
          <div className="day-col">
            <span className="day-name">Wed</span>
            <span className="day-number">16</span>
          </div>
          <div className="day-col">
            <span className="day-name">Thu</span>
            <span className="day-number">17</span>
          </div>
          <div className="day-col">
            <span className="day-name">Fri</span>
            <span className="day-number">18</span>
          </div>
        </div>

        {/* Main Grid Area */}
        <div className="calendar-grid-body">
          {/* Time lines (Background) */}
          <div className="time-grid">
            {['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM'].map((time) => (
              <div key={time} className="time-row">
                <div className="time-label">{time}</div>
                <div className="time-line"></div>
              </div>
            ))}
          </div>

          {/* Events Container - Positioned absolutely within the grid */}
          <div className="events-container">
            {/* Tuesday Events */}
            <div className="event event-blue" style={{ gridColumn: 2, top: 'calc(1 * 60px)', height: '60px' }}>
              <span className="event-title">Product team sync</span>
              <span className="event-time">10:00 - 11:00 AM</span>
            </div>
            <div className="event event-blue" style={{ gridColumn: 2, top: 'calc(6 * 60px)', height: '45px' }}>
              <span className="event-title">Customer interview</span>
              <span className="event-time">3:00 - 3:45 PM</span>
            </div>

            {/* Wednesday Events */}
            <div className="event event-purple" style={{ gridColumn: 3, top: 'calc(4 * 60px)', height: '60px' }}>
              <span className="event-title">Design review</span>
              <span className="event-time">1:00 - 2:00 PM</span>
            </div>

            {/* Thursday Events */}
            <div className="event event-purple" style={{ gridColumn: 4, top: 'calc(5 * 60px)', height: '60px' }}>
              <span className="event-title">Marketing planning</span>
              <span className="event-time">2:00 - 3:00 PM</span>
            </div>

            {/* Friday Events */}
            <div className="event event-green" style={{ gridColumn: 5, top: 'calc(7 * 60px)', height: '60px' }}>
              <span className="event-title">All hands</span>
              <span className="event-time">4:00 - 5:00 PM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
