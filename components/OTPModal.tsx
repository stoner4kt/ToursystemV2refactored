'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, RefreshCw, AlertCircle } from 'lucide-react';

interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerifySuccess: () => void;
  title?: string;
  description?: string;
}

export default function OTPModal({
  isOpen,
  onClose,
  onVerifySuccess,
  title = 'Security Authentication',
  description = 'A 6-digit administrative verification code is required to authorize this action.'
}: OTPModalProps) {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [sentCodeToast, setSentCodeToast] = useState<boolean>(false);

  const generateAndSendOTP = () => {
    setSending(true);
    setError('');
    
    // Simulate sending OTP
    setTimeout(() => {
      const pin = Math.floor(100000 + Math.random() * 90000).toString();
      setGeneratedCode(pin);
      setSending(false);
      setSentCodeToast(true);
      
      // Auto-hide toast after 8 seconds
      setTimeout(() => {
        setSentCodeToast(false);
      }, 8000);
    }, 800);
  };

  useEffect(() => {
    if (isOpen) {
      // Defer state updates to defuse synchronous cascading render warnings
      setTimeout(() => {
        setCode(['', '', '', '', '', '']);
        setError('');
        setSentCodeToast(false);
        generateAndSendOTP();
      }, 0);
    }
  }, [isOpen]);

  const handleInputChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;

    const newCode = [...code];
    newCode[index] = value.substring(value.length - 1); // Keep last char
    setCode(newCode);
    setError('');

    // Focus next element
    if (value !== '' && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && code[index] === '' && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const typedCode = code.join('');

    if (typedCode.length < 6) {
      setError('Please fill in all 6 digits.');
      return;
    }

    if (typedCode === generatedCode) {
      onVerifySuccess();
    } else {
      setError('Invalid OTP code. Please check and try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      {/* Simulation Code Toast */}
      {sentCodeToast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 border-l-4 border-amber-500 text-white p-4 rounded-lg shadow-xl max-w-sm animate-slide-in flex flex-col gap-1">
          <p className="text-xs font-bold text-amber-500 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" />
            [SIMULATED] ADMIN EMAIL NOTIFICATION
          </p>
          <p className="text-xs">
            An OTP verification code was sent to the director inbox:
          </p>
          <p className="text-lg font-mono font-black text-center text-amber-300 tracking-widest mt-1 bg-slate-800 py-1.5 rounded border border-slate-700">
            {generatedCode}
          </p>
          <span className="text-[10px] text-slate-400 text-right mt-0.5 italic">
            Enter this code to complete the verification.
          </span>
        </div>
      )}

      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-teal-50 p-2 rounded-lg text-teal-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-[10px] text-slate-500">Security Gate Active</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-xs text-slate-600 text-center mb-6 leading-relaxed">
            {description}
          </p>

          {/* OTP Code Inputs */}
          <div className="flex justify-center gap-2.5 mb-6">
            {code.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-input-${idx}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(e.target.value, idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                disabled={sending}
                className="w-11 h-12 text-center text-lg font-bold border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all disabled:opacity-50 text-slate-800 bg-slate-50 focus:bg-white"
                autoFocus={idx === 0}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-lg mb-6">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={sending}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md disabled:bg-slate-300"
            >
              Verify & Authorize Action
            </button>
            
            <button
              type="button"
              onClick={generateAndSendOTP}
              disabled={sending}
              className="text-[11px] font-bold text-slate-500 hover:text-teal-600 flex items-center gap-1 justify-center py-2 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sending ? 'animate-spin' : ''}`} />
              Resend verification code
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
