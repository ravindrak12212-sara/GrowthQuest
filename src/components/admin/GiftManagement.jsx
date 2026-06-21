import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { getAuth } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const GIFT_DATA = {
    Electronics: ['Boat Airdopes 181', 'JBL Speaker', 'Realme Buds', 'Power Bank', 'Mi Smart Band'],
    'Computer Accessories': ['Wireless Mouse', 'Mechanical Keyboard', 'Webcam', 'USB Hub'],
    Gaming: ['Gaming Mouse', 'Gaming Keyboard', 'Headset'],
    Toys: ['Teddy Bear', 'RC Car', 'Building Blocks', 'Barbie Doll', 'Puzzle Set'],
    'Baby Products': ['Baby Blanket', 'Baby Pillow', 'Baby Dress'],
    Fashion: ['T-Shirt', 'Hoodie', 'Backpack', 'Wallet', 'Sunglasses'],
    'Bags & Travel': ['Laptop Bag', 'Travel Pouch'],
    Accessories: ['Wrist Watch', 'Smart Band'],
    Beauty: ['Perfume', 'Skin Care Kit', 'Hair Dryer'],
    'Personal Care': ['Trimmer', 'Grooming Kit'],
    Fitness: ['Yoga Mat', 'Dumbbells'],
    Sports: ['Cricket Bat', 'Football'],
    'Home Essentials': ['Coffee Mug', 'Water Bottle', 'Table Lamp'],
    'Home Decor': ['Wall Clock', 'Photo Frame'],
    Kitchen: ['Lunch Box', 'Dinner Set'],
    Chocolates: ['Cadbury Celebration Pack', 'Ferrero Rocher', 'KitKat Box'],
    Snacks: ['Dry Fruit Box', 'Cookie Hamper'],
    Books: ['Atomic Habits', 'Rich Dad Poor Dad', 'Ikigai', 'Deep Work'],
    'Gift Cards': ['Amazon Gift Card', 'Flipkart Gift Card', 'Myntra Gift Card'],
    'Pet Care': ['Pet Food', 'Pet Toy'],
    Automobile: ['Car Perfume', 'Mobile Holder'],
    Gardening: ['Plant Seeds', 'Gardening Tools'],
    'Festival Specials': ['Diwali Hamper', 'Christmas Hamper'],
    'Premium Rewards': ['Smartphone', 'Tablet', 'Laptop'],
};

const TABS = {
    'WAITING_FOR_DETAILS': '⏳ Pending Details',
    'GIFT_ASSIGNED': '🎁 Assigned',
    'PACKED': '📦 Packed',
    'SHIPPED': '🚚 Shipped',
    'DELIVERED': '📬 Delivered'
};

function GiftManagement() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignGiftModalOpen, setAssignGiftModalOpen] = useState(false);
  const [isPackedConfirmationOpen, setPackedConfirmationOpen] = useState(false);
  const [isShippedModalOpen, setShippedModalOpen] = useState(false);
  const [isDeliveredConfirmationOpen, setDeliveredConfirmationOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [deliveryProfile, setDeliveryProfile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedGift, setSelectedGift] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [adminUser, setAdminUser] = useState(null);
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const [activeTab, setActiveTab] = useState('WAITING_FOR_DETAILS');

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
        setAdminUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    setLoading(true);
    const requestsQuery = query(
      collection(db, 'treasureUnlocks'),
      where('status', '==', activeTab),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(requestsQuery, async (snapshot) => {
      const fetchedRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        unlockDate: doc.data().createdAt?.toDate().toLocaleString() ?? 'N/A',
        assignedDate: doc.data().assignedAt?.toDate().toLocaleString() ?? 'N/A',
        packedDate: doc.data().packedAt?.toDate().toLocaleString() ?? 'N/A',
        shippedDate: doc.data().shippedAt?.toDate().toLocaleString() ?? 'N/A',
        deliveredDate: doc.data().deliveredAt?.toDate().toLocaleString() ?? 'N/A',
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
  }, [activeTab]);

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

  const handleOpenAssignGiftModal = (request) => {
    setSelectedRequest(request);
    setAssignGiftModalOpen(true);
    setSelectedCategory('');
    setSelectedGift('');
    setAssignmentMessage('');
  }

  const handleAssignGift = async () => {
    if (!selectedCategory || !selectedGift) {
        alert('Please select a category and a gift.');
        return;
    }

    if (!selectedRequest || !adminUser) {
        alert('An error occurred. Please try again.');
        return;
    }

    const unlockDocRef = doc(db, 'treasureUnlocks', selectedRequest.id);

    try {
        await updateDoc(unlockDocRef, {
            status: "GIFT_ASSIGNED",
            giftAssigned: true,
            giftCategory: selectedCategory,
            giftName: selectedGift,
            assignedAt: serverTimestamp(),
            assignedBy: adminUser.uid
        });

        setAssignmentMessage('✅ Gift assigned successfully.');
        setTimeout(() => {
            closeModal();
        }, 1500);

    } catch (error) {
        console.error("Error assigning gift:", error);
        setAssignmentMessage('Error assigning gift. Please try again.');
    }
  }

  const handleMarkPacked = async () => {
    if (!selectedRequest || !adminUser) {
      alert('An error occurred. Please try again.');
      return;
    }
    const unlockDocRef = doc(db, 'treasureUnlocks', selectedRequest.id);
    try {
      await updateDoc(unlockDocRef, {
        status: 'PACKED',
        packedAt: serverTimestamp(),
        packedBy: adminUser.email,
      });
      setAssignmentMessage('✅ Gift marked as packed.');
      setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (error) {
      console.error("Error marking as packed:", error);
      setAssignmentMessage('Error marking as packed. Please try again.');
    }
  };

  const handleMarkShipped = async () => {
    if (!selectedRequest || !adminUser) {
      alert('An error occurred. Please try again.');
      return;
    }
    const unlockDocRef = doc(db, 'treasureUnlocks', selectedRequest.id);
    try {
      const updateData = {
        status: 'SHIPPED',
        shippedAt: serverTimestamp(),
        shippedBy: adminUser.email,
      };

      if(trackingNumber) updateData.trackingNumber = trackingNumber;
      if(orderNotes) updateData.orderNotes = orderNotes;

      await updateDoc(unlockDocRef, updateData);

      setAssignmentMessage('✅ Gift marked as shipped successfully.');
      setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (error) {
      console.error("Error marking as shipped:", error);
      setAssignmentMessage('Error marking as shipped. Please try again.');
    }
  }

  const handleMarkDelivered = async () => {
    if (!selectedRequest || !adminUser) {
      alert('An error occurred. Please try again.');
      return;
    }
    const unlockDocRef = doc(db, 'treasureUnlocks', selectedRequest.id);
    try {
      await updateDoc(unlockDocRef, {
        status: 'DELIVERED',
        deliveredAt: serverTimestamp(),
        deliveredBy: adminUser.email,
      });
      setAssignmentMessage('✅ Gift marked as delivered successfully.');
      setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (error) {
      console.error("Error marking as delivered:", error);
      setAssignmentMessage('Error marking as delivered. Please try again.');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setAssignGiftModalOpen(false);
    setPackedConfirmationOpen(false);
    setShippedModalOpen(false);
    setDeliveredConfirmationOpen(false);
    setSelectedRequest(null);
    setDeliveryProfile(null);
    setAssignmentMessage('');
    setTrackingNumber('');
    setOrderNotes('');
  };

  // --- STYLES ---
  const containerStyle = {
    background: '#ffffff',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
  };

  const tabsContainerStyle = {
    display: 'flex',
    marginBottom: '1.5rem',
    borderBottom: '2px solid #e0e0e0'
  };

  const tabStyle = {
    padding: '1rem 1.5rem',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#666',
    borderBottom: '2px solid transparent'
  };

  const activeTabStyle = {
      ...tabStyle,
      color: '#4a00e0',
      fontWeight: '600',
      borderBottom: '2px solid #4a00e0'
  };

  const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '1.5rem' };
  const thStyle = { borderBottom: '2px solid #e0e0e0', padding: '12px 16px', textAlign: 'left', backgroundColor: '#f8f9fa', color: '#333', fontWeight: '600' };
  const tdStyle = { borderBottom: '1px solid #e0e0e0', padding: '12px 16px' };
  const buttonStyle = { padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: '#4a00e0', color: 'white', cursor: 'pointer', marginRight: '0.5rem' };
  const assignButtonStyle = { ...buttonStyle, background: '#28a745'};
  const packedButtonStyle = { ...buttonStyle, background: '#ffc107', color: 'black' };
  const shippedButtonStyle = { ...buttonStyle, background: '#17a2b8' };
  const deliveredButtonStyle = { ...buttonStyle, background: '#007bff' };
  const emptyStateStyle = { textAlign: 'center', padding: '3rem', fontSize: '1.2rem', color: '#666' };
  const loadingStyle = { textAlign: 'center', padding: '3rem', fontSize: '1.2rem', color: '#666' };
  const errorStyle = { textAlign: 'center', padding: '3rem', fontSize: '1.2rem', color: '#dc3545', whiteSpace: 'pre-wrap' };
  const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
  const modalContentStyle = { background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', maxWidth: '600px', width: '90%' };
  const modalHeaderStyle = { fontSize: '1.8rem', fontWeight: '600', color: '#4a00e0', marginBottom: '1.5rem' };
  const detailRowStyle = { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' };
  const detailLabelStyle = { fontWeight: 'bold', color: '#555' };
  const dropdownStyle = { width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', marginBottom: '1rem' };
  const inputStyle = { ...dropdownStyle, marginBottom: '1rem'};
  const successMessageStyle = { color: 'green', fontWeight: 'bold', textAlign: 'center', marginTop: '1rem' };

  const getDateForTab = (req) => {
    switch(activeTab) {
        case 'WAITING_FOR_DETAILS': return req.unlockDate;
        case 'GIFT_ASSIGNED': return req.assignedDate;
        case 'PACKED': return req.packedDate;
        case 'SHIPPED': return req.shippedDate;
        case 'DELIVERED': return req.deliveredDate;
        default: return req.unlockDate;
    }
  }

  const renderTable = () => {
      if (loading) return <div style={loadingStyle}>Loading requests...</div>;
      if (error) return <div style={errorStyle}>{error}</div>;
      if (requests.length === 0) return <div style={emptyStateStyle}>📭 No requests in this category.</div>

      return (
          <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                  <thead>
                      <tr>
                        <th style={thStyle}>Username</th>
                        <th style={thStyle}>Vault</th>
                        {activeTab !== 'WAITING_FOR_DETAILS' && <th style={thStyle}>Gift Name</th>}
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}>Date</th>
                        <th style={thStyle}>Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {requests.map(req => (
                          <tr key={req.id}>
                              <td style={tdStyle}>{req.username}</td>
                              <td style={tdStyle}>{req.vaultType}</td>
                              {activeTab !== 'WAITING_FOR_DETAILS' && <td style={tdStyle}>{req.giftName}</td>}
                              <td style={tdStyle}>{req.status}</td>
                              <td style={tdStyle}>{getDateForTab(req)}</td>
                              <td style={tdStyle}>
                                  <button style={buttonStyle} onClick={() => handleViewDetails(req)}>View Details</button>
                                  {activeTab === 'WAITING_FOR_DETAILS' && 
                                    <button style={assignButtonStyle} onClick={() => handleOpenAssignGiftModal(req)}>🎁 Assign Gift</button>}
                                  {activeTab === 'GIFT_ASSIGNED' && 
                                    <button style={packedButtonStyle} onClick={() => {setSelectedRequest(req); setPackedConfirmationOpen(true);}}>📦 Mark Packed</button>}
                                  {activeTab === 'PACKED' && 
                                    <button style={shippedButtonStyle} onClick={() => {setSelectedRequest(req); setShippedModalOpen(true);}}>🚚 Mark as Shipped</button>}
                                  {activeTab === 'SHIPPED' && 
                                    <button style={deliveredButtonStyle} onClick={() => {setSelectedRequest(req); setDeliveredConfirmationOpen(true);}}>📬 Mark as Delivered</button>}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )
  }

  return (
    <div style={containerStyle}>
        <h2 style={{ fontSize: '2rem', fontWeight: '600', color: '#4a00e0', marginBottom: '1.5rem' }}>🎁 Gift Management</h2>
        <div style={tabsContainerStyle}>
            {Object.keys(TABS).map(status => (
                <button 
                    key={status} 
                    style={activeTab === status ? activeTabStyle : tabStyle} 
                    onClick={() => setActiveTab(status)}>
                    {TABS[status]}
                </button>
            ))}
        </div>
        
        {renderTable()}

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

        {isAssignGiftModalOpen && selectedRequest && (
            <div style={modalOverlayStyle} onClick={closeModal}>
                <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                    <h3 style={modalHeaderStyle}>Assign Gift</h3>
                    {assignmentMessage ? <div style={successMessageStyle}>{assignmentMessage}</div> : (
                    <>
                        <div>
                            <label style={{fontWeight: '600', marginBottom: '0.5rem', display: 'block'}}>Category</label>
                            <select style={dropdownStyle} value={selectedCategory} onChange={(e) => {setSelectedCategory(e.target.value); setSelectedGift('');}}>
                                <option value="">Select a Category</option>
                                {Object.keys(GIFT_DATA).map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>
                        {selectedCategory && (
                            <div>
                                <label style={{fontWeight: '600', marginBottom: '0.5rem', display: 'block'}}>Gift Name</label>
                                <select style={dropdownStyle} value={selectedGift} onChange={(e) => setSelectedGift(e.target.value)}>
                                    <option value="">Select a Gift</option>
                                    {GIFT_DATA[selectedCategory].map(gift => (
                                        <option key={gift} value={gift}>{gift}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div style={{marginTop: '2rem', textAlign: 'right'}}>
                            <button style={{...buttonStyle, background: '#6c757d', marginRight: '1rem'}} onClick={closeModal}>Cancel</button>
                            <button style={{...buttonStyle, background: '#28a745'}} onClick={handleAssignGift}>Assign</button>
                        </div>
                    </>
                    )}
                </div>
            </div>
        )}

        {isPackedConfirmationOpen && selectedRequest && (
          <div style={modalOverlayStyle} onClick={closeModal}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
              <h3 style={modalHeaderStyle}>Confirm Packing</h3>
              {assignmentMessage ? <div style={successMessageStyle}>{assignmentMessage}</div> : (
                <>
                  <p>Are you sure you have packed this gift?</p>
                  <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                    <button style={{ ...buttonStyle, background: '#6c757d', marginRight: '1rem' }} onClick={closeModal}>Cancel</button>
                    <button style={{ ...buttonStyle, background: '#28a745' }} onClick={handleMarkPacked}>Confirm</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {isShippedModalOpen && selectedRequest && (
            <div style={modalOverlayStyle} onClick={closeModal}>
                <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                    <h3 style={modalHeaderStyle}>Mark Gift as Shipped</h3>
                    {assignmentMessage ? <div style={successMessageStyle}>{assignmentMessage}</div> : (
                    <>
                        <div>
                            <label style={{fontWeight: '600', marginBottom: '0.5rem', display: 'block'}}>Tracking Number (Optional)</label>
                            <input style={inputStyle} type="text" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                        </div>
                        <div>
                            <label style={{fontWeight: '600', marginBottom: '0.5rem', display: 'block'}}>Order Notes (Optional)</label>
                            <textarea style={inputStyle} rows="3" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
                        </div>
                        <div style={{marginTop: '2rem', textAlign: 'right'}}>
                            <button style={{...buttonStyle, background: '#6c757d', marginRight: '1rem'}} onClick={closeModal}>Cancel</button>
                            <button style={shippedButtonStyle} onClick={handleMarkShipped}>Mark as Shipped</button>
                        </div>
                    </>
                    )}
                </div>
            </div>
        )}

        {isDeliveredConfirmationOpen && selectedRequest && (
            <div style={modalOverlayStyle} onClick={closeModal}>
                <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                    <h3 style={modalHeaderStyle}>Confirm Delivery</h3>
                    {assignmentMessage ? <div style={successMessageStyle}>{assignmentMessage}</div> : (
                    <>
                        <p>Are you sure this gift has been successfully delivered to the user?</p>
                        <div style={{marginTop: '2rem', textAlign: 'right'}}>
                            <button style={{...buttonStyle, background: '#6c757d', marginRight: '1rem'}} onClick={closeModal}>Cancel</button>
                            <button style={deliveredButtonStyle} onClick={handleMarkDelivered}>Mark as Delivered</button>
                        </div>
                    </>
                    )}
                </div>
            </div>
        )}
    </div>
  );
}

export default GiftManagement;
