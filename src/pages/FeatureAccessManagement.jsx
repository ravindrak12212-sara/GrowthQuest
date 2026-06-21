
import React, { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

function FeatureAccessManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersList);
      } catch (err) {
        setError('Failed to fetch users.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleToggleTreasureAccess = async (userId, currentAccess) => {
    const userRef = doc(db, 'users', userId);
    try {
      await updateDoc(userRef, {
        treasureAccess: !currentAccess
      });
      setUsers(users.map(user => 
        user.id === userId ? { ...user, treasureAccess: !currentAccess } : user
      ));
    } catch (err) {
      setError('Failed to update user access.');
      console.error(err);
    }
  };

  const pageStyle = {
    fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
    padding: '2rem',
    backgroundColor: '#f4f7f6',
    minHeight: '100vh',
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '2rem',
    color: '#4a00e0',
    fontSize: '2.5rem',
    fontWeight: 'bold',
  };

  const tableContainerStyle = {
    overflowX: 'auto',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
  };

  const thStyle = {
    backgroundColor: '#f2f2f2',
    padding: '1rem',
    textAlign: 'left',
    borderBottom: '2px solid #ddd',
    color: '#333',
    fontWeight: '600',
  };

  const tdStyle = {
    padding: '1rem',
    borderBottom: '1px solid #ddd',
  };

  const trStyle = {
    transition: 'background-color 0.3s',
  };

  const actionButtonStyle = (enabled) => ({
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold',
    backgroundColor: enabled ? '#e74c3c' : '#2ecc71',
    minWidth: '100px',
  });

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading users...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>{error}</div>;
  }

  return (
    <div style={pageStyle}>
      <h1 style={headerStyle}>⚙️ Feature Access Management</h1>
      <div style={tableContainerStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>User Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Treasure Rewards</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={trStyle}>
                <td style={tdStyle}>{user.username}</td>
                <td style={tdStyle}>{user.email}</td>
                <td style={tdStyle}>
                  {user.treasureAccess ? '🟢 Enabled' : '🔴 Disabled'}
                </td>
                <td style={tdStyle}>
                  {user.online ? 'Online' : 'Offline'}
                </td>
                <td style={tdStyle}>
                  <button 
                    style={actionButtonStyle(user.treasureAccess)}
                    onClick={() => handleToggleTreasureAccess(user.id, user.treasureAccess)}
                  >
                    {user.treasureAccess ? '❌ Disable' : '✅ Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FeatureAccessManagement;
