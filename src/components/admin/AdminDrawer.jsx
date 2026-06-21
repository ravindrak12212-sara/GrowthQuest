import React from 'react';
import './AdminDrawer.css';

const AdminDrawer = ({ isOpen, onClose, handleLogout }) => {
  return (
    <>
      {isOpen && <div className="drawer-backdrop" onClick={onClose}></div>}
      <div className={`admin-drawer ${isOpen ? 'open' : ''}`}>
        <nav>
          <ul>
            <li><a href="#"><span role="img" aria-label="Dashboard">🏠</span> Dashboard</a></li>
            <li className="separator"></li>
            <li><a href="#"><span role="img" aria-label="Announcement Management">📢</span> Announcement Management</a></li>
            <li><a href="#"><span role="img" aria-label="Poll Management">🗳️</span> Poll Management</a></li>
            <li><a href="#"><span role="img" aria-label="Writing Challenges">✍️</span> Writing Challenges</a></li>
            <li><a href="#"><span role="img" aria-label="Redeem Requests">💰</span> Redeem Requests</a></li>
            <li><a href="#"><span role="img" aria-label="Treasure Key Management">🗝️</span> Treasure Key Management</a></li>
            <li><a href="#"><span role="img" aria-label="Gift Management">🎁</span> Gift Management (Coming Soon)</a></li>
            <li className="separator"></li>
            <li><a href="#"><span role="img" aria-label="Settings">⚙️</span> Settings</a></li>
            <li><a href="#" onClick={handleLogout}><span role="img" aria-label="Logout">🚪</span> Logout</a></li>
          </ul>
        </nav>
      </div>
    </>
  );
};

export default AdminDrawer;