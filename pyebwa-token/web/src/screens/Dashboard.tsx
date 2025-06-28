import React, { useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useProgram } from '../hooks/useProgram';
import { useUserRole } from '../hooks/useUserRole';
import { UserProfileMenu } from '../components/UserProfileMenu';
import { TokenStats } from '../components/TokenStats';
import { PurchaseTokens } from '../components/PurchaseTokens';
import { FamilyStats } from '../components/FamilyStats';

export const Dashboard: React.FC = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const program = useProgram();
  const { userInfo, isAdmin } = useUserRole();
  const [balance, setBalance] = useState<number>(0);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!publicKey || !program) return;
      
      try {
        // Get SOL balance
        const solBalance = await connection.getBalance(publicKey);
        setBalance(solBalance / LAMPORTS_PER_SOL);
        
        // Get token balance from family account
        const [familyPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("family"), publicKey.toBuffer()],
          program.programId
        );
        
        try {
          const familyAccount = await program.account.familyAccount.fetch(familyPDA);
          setTokenBalance(familyAccount.tokenBalance.toNumber());
        } catch (e) {
          // Family account doesn't exist yet
          setTokenBalance(0);
        }
      } catch (error) {
        console.error("Error fetching balances:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
    
    // Set up interval to refresh balances
    const interval = setInterval(fetchBalances, 5000);
    return () => clearInterval(interval);
  }, [publicKey, connection, program]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-green-800">
                🌳 PYEBWA Token
              </h1>
              <span className="ml-4 text-sm text-gray-500">
                Connecting Heritage to Homeland
              </span>
            </div>
            {publicKey ? (
              <UserProfileMenu 
                isAdmin={isAdmin} 
                userName={userInfo?.firstName ? `${userInfo.firstName} ${userInfo.lastName}` : undefined}
              />
            ) : (
              <WalletMultiButton />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {publicKey ? (
          <>
            {/* Wallet Info */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Your Wallet</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-mono text-sm">{publicKey.toBase58().slice(0, 20)}...</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">SOL Balance</p>
                  <p className="text-2xl font-bold">{balance.toFixed(4)} SOL</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">PYEBWA Balance</p>
                  <p className="text-2xl font-bold text-green-600">
                    {tokenBalance.toLocaleString()} PYEBWA
                  </p>
                </div>
              </div>
            </div>

            {/* Token Stats */}
            <div className="mb-8">
              <TokenStats />
            </div>

            {/* Main Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <PurchaseTokens />
              <FamilyStats />
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-4">Welcome to PYEBWA Token</h2>
              <p className="text-gray-600 mb-6">
                Connect your wallet to start preserving heritage and funding tree planting in Haiti.
              </p>
              <div className="flex justify-center">
                <WalletMultiButton />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};