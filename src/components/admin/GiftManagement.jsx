import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';

function GiftManagement() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [deliveryProfile, setDeliveryProfile] = useState(null);

  useEffect(() => {
    setLoading(true);
    const requestsQuery = query(
      collection(db, 'treasureUnlocks'),
      where('status', '==', 'WAITING_FOR_DETAILS'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(requestsQuery, async (snapshot) => {
      const fetchedRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        userId: doc.data().userId,
        vaultType: doc.data().vaultType,
        status: doc.data().status,
        unlockDate: doc.data().createdAt?.toDate().toLocaleString() ?? 'N/A',
      }));

      const userIds = [...new Set(fetchedRequests.map(req => req.userId))];
      const userPromises = userIds.map(userId => getDoc(doc(db, 'users', userId)));
      const userDocs = await Promise.all(userPromises);

      const usernamesMap = {};
      userDocs.forEach(userDoc => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          usernamesMap[userDoc.id] = userData.displayName || userData.username || 'Unknown User';
        } else {
          usernamesMap[userDoc.id] = 'Unknown User';
        }
      });

      const requestsWithUsernames = fetchedRequests.map(req => ({
        ...req,
        username: usernamesMap[req.userId]
      }));

      setRequests(requestsWithUsernames);
      setLoading(false);
    }, (err) => {
      console.error("Complete error object:", err);
      setError(`Error Code: ${err.code}\nError Message: ${err.message}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleViewDetails = async (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
    try {
      const profileDocRef = doc(db, 'deliveryProfiles', request.userId);
      const profileDoc = await getDoc(profileDocRef);
      if (profileDoc.exists()) {
        setDeliveryProfile(profileDoc.data());
      } else {
        console.log("No such delivery profile!");
      }
    } catch (error) {
      console.error("Error fetching delivery profile:", error);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
    setDeliveryProfile(null);
  };

  // --- STYLES ---
  const containerStyle = {
    background: '#ffffff',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
  };

  const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '1.5rem' };
  const thStyle = { borderBottom: '2px solid #e0e0e0', padding: '12px 16px', textAlign: 'left', backgroundColor: '#f8f9fa', color: '#333', fontWeight: '600' };
  const tdStyle = { borderBottom: '1px solid #e0e0e0', padding: '12px 16px' };
  const buttonStyle = { padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: '#4a00e0', color: 'white', cursor: 'pointer' };
  const emptyStateStyle = { textAlign: 'center', padding: '3rem', fontSize: '1.2rem', color: '#666' };
  const loadingStyle = { textAlign: 'center', padding: '3rem', fontSize: '1.2rem', color: '#666' };
  const errorStyle = { textAlign: 'center', padding: '3rem', fontSize: '1.2rem', color: '#dc3545', whiteSpace: 'pre-wrap' };
  const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
  const modalContentStyle = { background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', maxWidth: '600px', width: '90%' };
  const modalHeaderStyle = { fontSize: '1.8rem', fontWeight: '600', color: '#4a00e0', marginBottom: '1.5rem' };
  const detailRowStyle = { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' };
  const detailLabelStyle = { fontWeight: 'bold', color: '#555' };

  if (loading) return <div style={loadingStyle}>Loading pending requests...</div>;
  if (error) return <div style={errorStyle}>{error}</div>;

  return (
    <div style={containerStyle}>
        <h2 style={{ fontSize: '2rem', fontWeight: '600', color: '#4a00e0', marginBottom: '1.5rem' }}>🎁 Gift Management</h2>
        {requests.length === 0 ? (
            <div style={emptyStateStyle}>📭 No pending gift requests.</div>
        ) : (
            <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                    <thead><tr><th style={thStyle}>Username</th><th style={thStyle}>Vault</th><th style={thStyle}>Status</th><th style={thStyle}>Unlock Date</th><th style={thStyle}>Actions</th></tr></thead>
                    <tbody>
                        {requests.map(req => (
                            <tr key={req.id}>
                                <td style={tdStyle}>{req.username}</td>
                                <td style={tdStyle}>{req.vaultType}</td>
                                <td style={tdStyle}>{req.status}</td>
                                <td style={tdStyle}>{req.unlockDate}</td>
                                <td style={tdStyle}><button style={buttonStyle} onClick={() => handleViewDetails(req)}>View Details</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {isModalOpen && selectedRequest && (
            <div style={modalOverlayStyle} onClick={closeModal}>
                <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                    <h3 style={modalHeaderStyle}>Delivery Details</h3>
                    {deliveryProfile ? (
                        <div>
                            <div style={detailRowStyle}> <span style={detailLabelStyle}>Full Name:</span> <span>{deliveryProfile.fullName}</span> </div>
                            <div style={detailRowStyle}> <span style={detailLabelStyle}>Mobile Number:</span> <span>{deliveryProfile.mobileNumber}</span> </div>
                            <div style={detailRowStyle}> <span style={detailLabelStyle}>Address:</span> <span>{deliveryProfile.address}</span> </div>
                            <div style={detailRowStyle}> <span style={detailLabelStyle}>State:</span> <span>{deliveryProfile.state}</span> </div>
                            <div style={detailRowStyle}> <span style={detailLabelStyle}>District:</span> <span>{deliveryProfile.district}</span> </div>
                            <div style={detailRowStyle}> <span style={detailLabelStyle}>PIN Code:</span> <span>{deliveryProfile.pinCode}</span> </div>
                            <div style={detailRowStyle}> <span style= {detailLabelStyle}>Vault Type:</span> <span>{selectedRequest.vaultType}</span> </div>
                            <div style={detailRowStyle}> <span style={detailLabelStyle}>Unlock Date:</span> <span>{selectedRequest.unlockDate}</span> </div>
                            <div style={detailRowStyle}> <span style={detailLabelStyle}>Status:</span> <span>{selectedRequest.status}</span> </div>
                        </div>
                    ) : <p>Loading details...</p>}
                    <div style={{marginTop: '2rem', textAlign: 'right'}}>
                        <button style={{...buttonStyle, background: '#6c757d'}} onClick={closeModal}>Close</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

export default GiftManagement;
