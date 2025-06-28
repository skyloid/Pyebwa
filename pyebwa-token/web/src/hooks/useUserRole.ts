import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface UserInfo {
  userType: 'family' | 'planter' | 'admin' | 'validator';
  email?: string;
  firstName?: string;
  lastName?: string;
}

export const useUserRole = () => {
  const { publicKey } = useWallet();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!publicKey) {
        setUserInfo(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // For demo purposes, check if the public key matches a known admin address
        const ADMIN_PUBLIC_KEYS = [
          // Add admin public keys here
          'AdminPubKey1...',
          'AdminPubKey2...',
        ];
        
        if (ADMIN_PUBLIC_KEYS.includes(publicKey.toBase58())) {
          setUserInfo({ userType: 'admin' });
          setLoading(false);
          return;
        }

        const apiUrl = process.env.REACT_APP_API_URL || 'https://rasin.pyebwa.com/api';
        const token = localStorage.getItem('token');
        
        if (!token) {
          // No token, default to family type
          setUserInfo({ userType: 'family' });
          setLoading(false);
          return;
        }
        
        const response = await fetch(`${apiUrl}/users/info/${publicKey.toBase58()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserInfo(data.user);
        } else if (response.status === 404) {
          // User not found in database, default to family type
          setUserInfo({ userType: 'family' });
        } else {
          throw new Error('Failed to fetch user info');
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Default to family type on error
        setUserInfo({ userType: 'family' });
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [publicKey]);

  return {
    userInfo,
    isAdmin: userInfo?.userType === 'admin',
    loading,
    error,
  };
};