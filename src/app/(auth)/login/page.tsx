'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Building2, Lock, Mail, AlertCircle } from 'lucide-react';
import { appConfig } from '@/config/app.config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('demo@acme.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: unknown) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white font-bold text-2xl shadow-lg mb-4">
          {appConfig.appName[0]}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">{appConfig.appName} CRM</h2>
        <p className="mt-2 text-xs text-slate-400">Enterprise Multi-Tenant Sales Platform</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-2xl rounded-lg sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-4 rounded-md bg-rose-50 p-3 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
              Sign In to Dashboard
            </Button>
          </form>

          {/* Quick Demo Credentials Box */}
          <div className="mt-6 pt-6 border-t border-slate-100 bg-slate-50/80 -mx-4 -mb-4 p-4 rounded-b-lg">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Seeded Demo Accounts:
            </p>
            <div className="space-y-1.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEmail('demo@acme.com');
                  setPassword('password123');
                }}
                className="w-full text-left p-2 rounded bg-white border border-slate-200 hover:border-brand-300 transition-colors flex justify-between items-center"
              >
                <div>
                  <span className="font-semibold text-slate-800">Acme Corp (Owner)</span>
                  <span className="block text-[10px] text-slate-500">demo@acme.com</span>
                </div>
                <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">Owner</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('sales@acme.com');
                  setPassword('password123');
                }}
                className="w-full text-left p-2 rounded bg-white border border-slate-200 hover:border-brand-300 transition-colors flex justify-between items-center"
              >
                <div>
                  <span className="font-semibold text-slate-800">Acme Corp (Sales Rep)</span>
                  <span className="block text-[10px] text-slate-500">sales@acme.com</span>
                </div>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">Rep</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
