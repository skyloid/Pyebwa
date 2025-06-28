import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaShieldAlt, FaCog, FaSignOutAlt, FaChevronDown } from 'react-icons/fa';

interface UserProfileMenuProps {
  isAdmin?: boolean;
  userName?: string;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ isAdmin = false, userName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { publicKey, disconnect } = useWallet();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!publicKey) return null;

  const handleDisconnect = () => {
    disconnect();
    setIsOpen(false);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const displayName = userName || `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
          <FaUser className="text-white text-sm" />
        </div>
        <span className="text-sm font-medium text-gray-700">{displayName}</span>
        <FaChevronDown className={`text-gray-500 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500 mt-1">
              {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => handleNavigation('/profile')}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3"
            >
              <FaUser className="text-gray-400" />
              <span>My Profile</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => handleNavigation('/admin')}
                className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3"
              >
                <FaShieldAlt className="text-blue-500" />
                <span>Admin Dashboard</span>
              </button>
            )}

            <button
              onClick={() => handleNavigation('/settings')}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3"
            >
              <FaCog className="text-gray-400" />
              <span>Settings</span>
            </button>
          </div>

          {/* Disconnect */}
          <div className="border-t border-gray-100 pt-2">
            <button
              onClick={handleDisconnect}
              className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3"
            >
              <FaSignOutAlt className="text-red-500" />
              <span>Disconnect Wallet</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};