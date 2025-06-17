import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '../hooks/useProgram';
import { paymentService } from '../services/payment.service';
import { useTranslation } from 'react-i18next';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { publicKey } = useWallet();
  const program = useProgram();
  
  const [amount, setAmount] = useState<string>('10000');
  const [paymentMethod, setPaymentMethod] = useState<'sol' | 'card'>('sol');
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenPrice, setTokenPrice] = useState<number>(0.0001);
  const [limits, setLimits] = useState<any>(null);
  const [step, setStep] = useState<'amount' | 'payment' | 'confirm'>('amount');

  useEffect(() => {
    if (publicKey) {
      checkLimits();
    }
  }, [publicKey]);

  const checkLimits = async () => {
    if (!publicKey) return;
    const userLimits = await paymentService.checkPurchaseLimits(publicKey.toBase58());
    setLimits(userLimits);
  };

  const calculateCost = () => {
    const tokenAmount = parseInt(amount || '0');
    const basePrice = tokenPrice * 1000000000; // Convert to lamports
    return paymentService.calculateTokenCost(tokenAmount, 0, basePrice); // Supply would come from chain
  };

  const handlePurchase = async () => {
    if (!publicKey || !program) return;
    
    setLoading(true);
    setError(null);

    try {
      const tokenAmount = parseInt(amount);
      const { costInLamports, costInUSD } = calculateCost();

      let result;
      if (paymentMethod === 'sol') {
        result = await paymentService.purchaseWithSOL(program, { publicKey }, tokenAmount);
      } else {
        result = await paymentService.purchaseWithCard(
          publicKey.toBase58(),
          tokenAmount,
          costInUSD,
          email
        );
      }

      if (result.success) {
        // Create invoice
        await paymentService.createInvoice(
          publicKey.toBase58(),
          tokenAmount,
          costInUSD,
          paymentMethod
        );
        
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Purchase failed');
      }
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const { costInUSD } = calculateCost();
  const tokenAmount = parseInt(amount || '0');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{t('purchase.title')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'amount' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('purchase.amount')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  min="1000"
                  max={limits?.remainingDaily || 1000000}
                  step="1000"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">PYEBWA</span>
                </div>
              </div>
              {limits && (
                <p className="text-sm text-gray-500 mt-1">
                  Daily limit: {limits.remainingDaily.toLocaleString()} / {limits.dailyLimit.toLocaleString()}
                </p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-md space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('purchase.pricePerToken')}</span>
                <span className="font-medium">${tokenPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Trees Funded</span>
                <span className="font-medium text-green-600">
                  ~{(tokenAmount * 0.5 / 200).toFixed(1)} 🌳
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">{t('purchase.totalCost')}</span>
                <span className="font-bold text-lg">${costInUSD.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setStep('payment')}
              disabled={!amount || parseInt(amount) < 1000}
              className="w-full py-3 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Continue to Payment
            </button>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-3">Select Payment Method</h3>
              <div className="space-y-2">
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="sol"
                    checked={paymentMethod === 'sol'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'sol')}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Pay with SOL</div>
                    <div className="text-sm text-gray-500">Direct from your wallet</div>
                  </div>
                  <img src="/sol-logo.svg" alt="SOL" className="w-8 h-8" />
                </label>

                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'card')}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Pay with Card</div>
                    <div className="text-sm text-gray-500">Visa, Mastercard, etc.</div>
                  </div>
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="7" width="18" height="10" rx="2" strokeWidth="2"/>
                    <path d="M3 11h18" strokeWidth="2"/>
                  </svg>
                </label>
              </div>
            </div>

            {paymentMethod === 'card' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (for receipt)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  placeholder="your@email.com"
                />
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setStep('amount')}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 py-3 px-4 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Review Order
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-3">Confirm Purchase</h3>
              <div className="bg-gray-50 p-4 rounded-md space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tokens</span>
                  <span className="font-medium">{tokenAmount.toLocaleString()} PYEBWA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method</span>
                  <span className="font-medium">{paymentMethod === 'sol' ? 'SOL' : 'Credit Card'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Trees Funded</span>
                  <span className="font-medium text-green-600">
                    ~{(tokenAmount * 0.5 / 200).toFixed(1)} trees
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-lg">${costInUSD.toFixed(2)} USD</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setStep('payment')}
                disabled={loading}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handlePurchase}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  'Complete Purchase'
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              By completing this purchase, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        )}
      </div>
    </div>
  );
};