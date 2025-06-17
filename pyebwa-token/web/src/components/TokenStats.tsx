import React, { useEffect, useState } from 'react';
import { useProgram } from '../hooks/useProgram';
import { PublicKey } from '@solana/web3.js';

interface TokenPoolData {
  totalSupply: number;
  treesFunded: number;
  heritagePreserved: number;
  tokenPrice: number;
}

export const TokenStats: React.FC = () => {
  const program = useProgram();
  const [stats, setStats] = useState<TokenPoolData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!program) return;

      try {
        const [tokenPoolPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("token_pool")],
          program.programId
        );

        const tokenPool = await program.account.tokenPool.fetch(tokenPoolPDA);
        
        setStats({
          totalSupply: tokenPool.totalSupply.toNumber(),
          treesFunded: tokenPool.treesFunded.toNumber(),
          heritagePreserved: tokenPool.heritagePreserved.toNumber(),
          tokenPrice: tokenPool.tokenPrice.toNumber() / 1000000000, // Convert lamports to SOL
        });
      } catch (error) {
        console.error("Error fetching token stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [program]);

  if (loading || !stats) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i}>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Platform Statistics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">Total Supply</p>
          <p className="text-2xl font-bold text-blue-600">
            {stats.totalSupply.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">PYEBWA</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Trees Funded</p>
          <p className="text-2xl font-bold text-green-600">
            {stats.treesFunded.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">🌳</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Heritage Items</p>
          <p className="text-2xl font-bold text-purple-600">
            {stats.heritagePreserved.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">📸</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Token Price</p>
          <p className="text-2xl font-bold text-orange-600">
            ${(stats.tokenPrice * 30).toFixed(4)}
          </p>
          <p className="text-xs text-gray-400">USD</p>
        </div>
      </div>
    </div>
  );
};