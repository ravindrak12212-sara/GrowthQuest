import React from 'react';
import './AdminDrawer.css';

const AdminDrawer = ({ isOpen, onClose, handleLogout, activeTab, setActiveTab }) => {
  return (
    <>
      {isOpen && <div className="drawer-backdrop" onClick={onClose}></div>}
      <div className={`admin-drawer ${isOpen ? 'open' : ''}`}>
        <nav>
          <ul>
            <li><a href="#" onClick={() => { if (setActiveTab) setActiveTab('polls'); if (onClose) onClose(); }}><span role="img" aria-label="Dashboard">🏠</span> Dashboard</a></li>
            <li className="separator"></li>
            <li><a href="#" onClick={() => { if (setActiveTab) setActiveTab('announcements'); if (onClose) onClose(); }}><span role="img" aria-label="Announcement Management">📢</span> Announcement Management</a></li>
            <li><a href="#" onClick={() => { if (setActiveTab) setActiveTab('polls'); if (onClose) onClose(); }}><span role="img" aria-label="Poll Management">🗳️</span> Poll Management</a></li>
            <li><a href="#" onClick={() => { if (setActiveTab) setActiveTab('writing'); if (onClose) onClose(); }}><span role="img" aria-label="Writing Challenges">✍️</span> Writing Challenges</a></li>
            <li><a href="#" onClick={() => { if (setActiveTab) setActiveTab('redeemRequests'); if (onClose) onClose(); }}><span role="img" aria-label="Redeem Requests">💰</span> Redeem Requests</a></li>
            <li><a href="#" onClick={() => { if (setActiveTab) setActiveTab('treasureKey'); if (onClose) onClose(); }}><span role="img" aria-label="Treasure Key Management">🗝️</span> Treasure Key Management</a></li>
            <li><a href="#" onClick={() => { if (setActiveTab) setActiveTab('giftManagement'); if (onClose) onClose(); }}><span role="img" aria-label="Gift Management">🎁</span> Gift Management (Coming Soon)</a></li>
            <li><a href="#" onClick={() => { if (setActiveTab) setActiveTab('gqBuddy'); if (onClose) onClose(); }}><span role="img" aria-label="GQ Buddy">🤖</span> GQ Buddy Chat</a></li>
            <li className="separator"></li>
            <li><a href="#" onClick={() => { if (setActiveTab) setActiveTab('featureAccess'); if (onClose) onClose(); }}><span role="img" aria-label="Settings">⚙️</span> Settings</a></li>
            <li><a href="#" onClick={handleLogout}><span role="img" aria-label="Logout">🚪</span> Logout</a></li>
          </ul>
        </nav>
      </div>
    </>
  );
};

export default AdminDrawer;