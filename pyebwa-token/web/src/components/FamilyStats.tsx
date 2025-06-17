import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '../hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import { Link } from 'react-router-dom';

interface FamilyAccountData {
  tokenBalance: number;
  heritageItems: number;
  treesFunded: number;
  totalSpent: number;
}

export const FamilyStats: React.FC = () => {
  const { publicKey } = useWallet();
  const program = useProgram();
  const [stats, setStats] = useState<FamilyAccountData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!publicKey || !program) {
        setLoading(false);
        return;
      }

      try {
        const [familyAccountPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("family"), publicKey.toBuffer()],
          program.programId
        );

        const familyAccount = await program.account.familyAccount.fetch(familyAccountPDA);
        
        setStats({
          tokenBalance: familyAccount.tokenBalance.toNumber(),
          heritageItems: familyAccount.heritageItems,
          treesFunded: familyAccount.treesFunded,
          totalSpent: familyAccount.totalSpent.toNumber(),
        });
      } catch (error) {
        // Account doesn't exist yet
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [publicKey, program]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Your Impact</h2>
      
      {stats ? (
        <>
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Heritage Items Preserved</span>
              <span className="text-2xl font-bold text-purple-600">
                {stats.heritageItems}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Trees Funded</span>
              <span className="text-2xl font-bold text-green-600">
                {stats.treesFunded} 🌳
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tokens Spent</span>
              <span className="text-lg font-medium">
                {stats.totalSpent.toLocaleString()} PYEBWA
              </span>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-4">
              Your preserved memories have funded {stats.treesFunded} trees in Haiti,
              offsetting approximately {(stats.treesFunded * 250).toLocaleString()} kg of CO₂.
            </p>
            
            <Link
              to="/preserve"
              className="block w-full text-center py-3 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Preserve Heritage →
            </Link>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            Start preserving your family heritage to fund tree planting in Haiti.
          </p>
          <Link
            to="/preserve"
            className="inline-block py-3 px-6 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Get Started →
          </Link>
        </div>
      )}
    </div>
  );
};