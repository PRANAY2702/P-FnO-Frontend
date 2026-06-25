import React, { useState, useEffect } from 'react';
import { X, Wallet, ArrowDownCircle, ArrowUpCircle, History, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface WalletModalProps {
  onClose: () => void;
}

export default function WalletModal({ onClose }: WalletModalProps) {
  const { token, user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  const fetchWallet = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/wallet/balance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setBalance(data.balance);
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    }
  };

  useEffect(() => {
    if (token) fetchWallet();
  }, [token]);

  const handleDeposit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Create order
      const orderRes = await fetch('http://localhost:3001/api/wallet/deposit/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: Number(amount) })
      });
      
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      // 2. Open Razorpay or mock flow
      const rzpKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'dummy_key_id';
      
      if (rzpKey.includes('replace_me') || rzpKey.includes('dummy')) {
        // MOCK FLOW
        setTimeout(async () => {
          try {
            const verifyRes = await fetch('http://localhost:3001/api/wallet/deposit/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: orderData.order.id,
                razorpay_payment_id: `pay_mock_${Date.now()}`,
                razorpay_signature: 'mock_signature'
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              setSuccess('Deposit successful! (Test Mode — Configure Razorpay keys for production)');
              setAmount('');
              fetchWallet();
            } else {
              setError(verifyData.error || 'Payment verification failed');
            }
          } catch (err) {
            setError('Payment verification error');
          } finally {
            setLoading(false);
          }
        }, 1500);
        return; // Early return so we don't open Razorpay script
      }

      // REAL RAZORPAY FLOW
      const options = {
        key: rzpKey, 
        amount: orderData.order.amount,
        currency: 'INR',
        name: 'P-FnO Platform',
        description: 'Wallet Deposit',
        order_id: orderData.order.id,
        handler: async function (response: any) {
          try {
            // 3. Verify payment
            const verifyRes = await fetch('http://localhost:3001/api/wallet/deposit/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              setSuccess('Deposit successful!');
              setAmount('');
              fetchWallet();
            } else {
              setError(verifyData.error || 'Payment verification failed');
            }
          } catch (err) {
            setError('Payment verification error');
          } finally {
             setLoading(false);
          }
        },
        prefill: {
          name: user?.fullName || 'User',
          email: user?.email || '',
        },
        theme: {
          color: '#3B82F6' // blue-500
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        setError(`Payment Failed: ${response.error.description}`);
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Deposit error');
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (Number(amount) > balance) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('http://localhost:3001/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: Number(amount) })
      });
      
      const data = await res.json();
      if (res.ok) {
        setSuccess('Withdrawal successful!');
        setAmount('');
        fetchWallet();
      } else {
        setError(data.error || 'Failed to withdraw');
      }
    } catch (err: any) {
      setError(err.message || 'Withdrawal error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#1C1C1E] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Premium Header */}
        <div className="relative p-6 overflow-hidden border-b border-gray-800/50">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-[#1C1C1E] to-emerald-900/10"></div>
          
          <div className="relative flex items-start justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-300 tracking-wide flex items-center gap-2">
              <Wallet size={18} className="text-blue-400" />
              WALLET BALANCE
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 p-1.5 rounded-full transition-colors backdrop-blur-sm"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="relative">
            <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-gray-400 font-mono tracking-tight drop-shadow-sm">
              ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-blue-400 mt-2 font-medium tracking-widest uppercase">Available for Trading</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-4 gap-4 border-b border-gray-800 justify-between items-center">
          <div className="flex gap-4">
            <button
              onClick={() => { setActiveTab('deposit'); setError(null); setSuccess(null); }}
              className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'deposit' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
            >
              <ArrowDownCircle size={16} /> Deposit
            </button>
            <button
              onClick={() => { setActiveTab('withdraw'); setError(null); setSuccess(null); }}
              className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'withdraw' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
            >
              <ArrowUpCircle size={16} /> Withdraw
            </button>
          </div>
          
          <button
            onClick={() => {
              onClose();
              window.location.href = '/transactions';
            }}
            className="pb-3 text-sm font-semibold text-gray-500 hover:text-blue-400 transition-colors flex items-center gap-1.5"
          >
            Ledger <History size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl">
              {success}
            </div>
          )}

          {(activeTab === 'deposit' || activeTab === 'withdraw') && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#0A0A0B] border border-gray-800 text-white rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                  />
                </div>
              </div>

              {activeTab === 'deposit' ? (
                <button
                  onClick={handleDeposit}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                >
                  {loading ? 'Processing...' : 'Deposit via Razorpay'}
                </button>
              ) : (
                <button
                  onClick={handleWithdraw}
                  disabled={loading || Number(amount) > balance}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                >
                  {loading ? 'Processing...' : 'Withdraw Funds'}
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
