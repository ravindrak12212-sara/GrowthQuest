import { useEffect, useCallback } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const useHeartbeat = (userId) => {
  const updateUserLastSeen = useCallback(() => {
    if (!userId) return;
    const userDocRef = doc(db, 'users', userId);
    updateDoc(userDocRef, {
      lastSeen: serverTimestamp(),
    }).catch((error) => {
      console.error("Error updating lastSeen: ", error);
    });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    // Initial update
    updateUserLastSeen();

    // Set up heartbeat interval
    const intervalId = setInterval(updateUserLastSeen, 20000);

    // Add event listeners for tab/browser closing
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updateUserLastSeen();
      }
    };

    const handleBeforeUnload = () => {
        updateUserLastSeen();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleBeforeUnload);
    window.addEventListener('beforeunload', handleBeforeUnload);


    // Cleanup
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleBeforeUnload);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userId, updateUserLastSeen]);

  return updateUserLastSeen;
};

export default useHeartbeat;
