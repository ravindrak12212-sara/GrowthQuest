import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebase';
import { doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

const InputField = ({ id, label, icon, value, onChange, error, type = 'text', rows }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-semibold text-gray-600 mb-2">
            {icon} {label}
        </label>
        <div className="relative">
            {type === 'textarea' ? (
                <textarea
                    id={id}
                    rows={rows}
                    value={value || ''}
                    onChange={onChange}
                    className={`w-full bg-gray-50 border rounded-xl py-4 px-5 text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 transition-shadow shadow-sm ${error ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                />
            ) : (
                <input
                    type={type}
                    id={id}
                    value={value || ''}
                    onChange={onChange}
                    className={`w-full bg-gray-50 border rounded-xl py-4 px-5 text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 transition-shadow shadow-sm ${error ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                />
            )}
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
);

const Modal = ({ title, message, buttonText, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
            <p className="text-gray-600 mb-8 whitespace-pre-wrap">{message}</p>
            <button
                onClick={onClose}
                className="w-full bg-purple-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
                {buttonText}
            </button>
        </div>
    </div>
);


const DeliveryProfile = ({ user }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        mobileNumber: '',
        address: '',
        state: '',
        district: '',
        pinCode: ''
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const unlockId = queryParams.get('unlockId');

    const fetchDeliveryProfile = useCallback(async () => {
        if (!user || !user.uid) return;
        try {
            const docRef = doc(db, 'deliveryProfiles', user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const sanitizedData = {
                    fullName: data.fullName || '',
                    mobileNumber: data.mobileNumber || '',
                    address: data.address || '',
                    state: data.state || '',
                    district: data.district || '',
                    pinCode: data.pinCode || ''
                };
                setFormData(sanitizedData);
            }
        } catch (error) {
            console.error("Error fetching delivery profile:", error);
            setShowErrorModal(true);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchDeliveryProfile();
        }
    }, [user, fetchDeliveryProfile]);

    const validate = useCallback(() => {
        const newErrors = {};
        let isValid = true;
        for (const key in formData) {
            const value = formData[key] ? formData[key].trim() : '';
            if (!value) {
                newErrors[key] = 'This field is required.';
                isValid = false;
            } else if (key === 'mobileNumber' && !/^\d{10}$/.test(value)) {
                newErrors[key] = 'Mobile number must be exactly 10 digits.';
                isValid = false;
            } else if (key === 'pinCode' && !/^\d{6}$/.test(value)) {
                newErrors[key] = 'PIN code must be exactly 6 digits.';
                isValid = false;
            }
        }
        setErrors(newErrors);
        return isValid;
    }, [formData]);
    
    useEffect(() => {
        const allFieldsFilled = Object.values(formData).every(val => val && val.trim() !== '');
        setIsFormValid(allFieldsFilled);
    }, [formData]);

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
        if (errors[id]) {
            setErrors(prev => ({ ...prev, [id]: null }));
        }
    };

    const handleSave = async () => {
        if (!user || !user.uid || !unlockId || !validate()) {
            if (!unlockId) {
                 setShowErrorModal(true);
            }
            return;
        }
        setIsLoading(true);

        try {
            const batch = writeBatch(db);
            const profileRef = doc(db, 'deliveryProfiles', user.uid);
            const unlockRef = doc(db, 'treasureUnlocks', unlockId);

            const profileData = { ...formData };
            
            const docSnap = await getDoc(profileRef);
            if (!docSnap.exists()) {
                profileData.createdAt = serverTimestamp();
            }
            profileData.updatedAt = serverTimestamp();

            batch.set(profileRef, profileData, { merge: true });

            batch.update(unlockRef, {
                deliveryDetailsSubmitted: true,
                status: 'WAITING_FOR_DETAILS',
                updatedAt: serverTimestamp()
            });

            await batch.commit();
            console.log("Opening success modal");
            setIsSaved(true);
            setShowSuccessModal(true);

        } catch (error) {
            console.error("Error saving details: ", error);
            setShowErrorModal(true);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSuccessModalClose = () => {
        setShowSuccessModal(false);
        navigate('/treasure-vault');
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#FFF9F0'}}>
                <p className="text-lg text-gray-600">Loading Delivery Information...</p>
            </div>
        );
    }

    return (
        <>
            {showSuccessModal && (
                <Modal 
                    title="✅ Delivery Details Saved!"
                    message={`Your delivery information has been securely saved.\n\nWe'll contact you when your Mystery Gift is ready for dispatch.`}
                    buttonText="Back to Treasure Vault"
                    onClose={handleSuccessModalClose}
                />
            )}
            {showErrorModal && (
                <Modal 
                    title="⚠️ Error"
                    message="Something went wrong. Please try again later."
                    buttonText="Close"
                    onClose={() => setShowErrorModal(false)}
                />
            )}

            <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-4 sm:p-6" style={{backgroundColor: '#FFF9F0'}}>
                <div className="text-center w-full max-w-xl mx-auto mb-6">
                    <h1 className="text-4xl sm:text-5xl font-bold text-gray-800">📦 Delivery Information</h1>
                    <p className="text-lg text-green-600 font-semibold mt-3">Your Mystery Gift has been reserved!</p>
                    <p className="text-gray-600 mt-2 max-w-md mx-auto">
                        Please provide your delivery address so we can safely deliver your Mystery Gift.
                    </p>
                </div>

                <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-8 sm:p-10">
                    <div className="mb-8">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center text-purple-600 font-semibold">
                                <span className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full text-lg">✔</span>
                                <span className="ml-3">Treasure Reserved</span>
                            </div>
                            <div className="flex-1 h-0.5 bg-gray-200 mx-4"></div>
                            <div className="flex items-center text-purple-600 font-semibold">
                                <span className="flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded-full font-bold text-lg">●</span>
                                <span className="ml-3">Delivery Details</span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={(e) => e.preventDefault()}>
                        <div className="space-y-6">
                            <InputField id="fullName" label="Full Name" icon="👤" value={formData.fullName} onChange={handleChange} error={errors.fullName} />
                            <InputField id="mobileNumber" label="Mobile Number" icon="📱" type="tel" value={formData.mobileNumber} onChange={handleChange} error={errors.mobileNumber} />
                            <InputField id="address" label="Address" icon="📍" type="textarea" rows="3" value={formData.address} onChange={handleChange} error={errors.address} />
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="sm:col-span-1">
                                    <InputField id="state" label="State" icon="🏙️" value={formData.state} onChange={handleChange} error={errors.state} />
                                </div>
                                <div className="sm:col-span-1">
                                    <InputField id="district" label="District" icon="🏡" value={formData.district} onChange={handleChange} error={errors.district} />
                                </div>
                                <div className="sm:col-span-1">
                                    <InputField id="pinCode" label="PIN Code" icon="📮" value={formData.pinCode} onChange={handleChange} error={errors.pinCode} />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 p-4 bg-gray-50 rounded-lg flex items-center">
                            <span className="text-xl mr-3">🔒</span>
                            <p className="text-sm text-gray-600">Your Mystery Gift will only be delivered to the address provided above.</p>
                        </div>

                        <div className="mt-10 text-center">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={!isFormValid || isLoading || isSaved}
                                className="w-full bg-purple-600 text-white font-bold text-lg py-4 px-8 rounded-xl shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300 disabled:opacity-40 disabled:cursor-not-allowed transition-transform transform hover:scale-105"
                            >
                                {isLoading ? 'Saving...' : (isSaved ? 'Details Saved!' : 'Save Delivery Details')}
                            </button>
                            <Link to="/dashboard" className="inline-block text-gray-500 hover:text-gray-700 font-medium mt-6">
                                &larr; Back to Dashboard
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default DeliveryProfile;
