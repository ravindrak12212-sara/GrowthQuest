import React from 'react';
import './AdminHeader.css';

const AdminHeader = ({ handleLogout, toggleDrawer }) => {
  return (
    <header className="admin-header">
      <div className="header-left">
        <button className="hamburger-btn" onClick={toggleDrawer}>&#9776;</button>
        <h1>GrowthQuest Admin</h1>
      </div>
      <div className="header-right">
        <span>Admin</span>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>
    </header>
  );
};

export default AdminHeader;