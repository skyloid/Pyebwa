import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useProgram } from '../hooks/useProgram';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

export const PurchaseTokens: React.FC = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const program = useProgram();
  const [amount, setAmount] = useState<string>('1000');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateCost = (tokenAmount: number): number => {
    // Get current price from program (simplified for now)
    const basePrice = 0.0001; // $0.0001 per token
    return tokenAmount * basePrice;
  };

  const handlePurchase = async () => {
    if (!publicKey || !program) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const tokenAmount = parseInt(amount);
      if (isNaN(tokenAmount) || tokenAmount <= 0) {
        throw new Error('Invalid amount');
      }

      // Get PDAs
      const [tokenPoolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("token_pool")],
        program.programId
      );

      const [familyAccountPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("family"), publicKey.toBuffer()],
        program.programId
      );

      // Call purchase_tokens instruction
      const tx = await program.methods
        .purchaseTokens(new anchor.BN(tokenAmount))
        .accounts({
          buyer: publicKey,
          familyAccount: familyAccountPDA,
          tokenPool: tokenPoolPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Purchase transaction:", tx);
      setSuccess(true);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setSuccess(false);
        setAmount('1000');
      }, 3000);

    } catch (err: any) {
      console.error("Purchase error:", err);
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Purchase PYEBWA Tokens</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount of Tokens
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="1000"
            min="1"
            step="100"
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">Token Amount:</span>
            <span className="font-medium">{parseInt(amount || '0').toLocaleString()} PYEBWA</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">Price per Token:</span>
            <span className="font-medium">$0.0001</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-sm font-medium">Total Cost:</span>
            <span className="font-bold text-green-600">
              ${calculateCost(parseInt(amount || '0')).toFixed(2)} USD
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            ✅ Successfully purchased {amount} PYEBWA tokens!
          </div>
        )}

        <button
          onClick={handlePurchase}
          disabled={loading || !publicKey || !amount}
          className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
            loading || !publicKey || !amount
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </span>
          ) : (
            'Purchase Tokens'
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Tokens will be added to your wallet immediately after purchase
        </p>
      </div>
    </div>
  );
};