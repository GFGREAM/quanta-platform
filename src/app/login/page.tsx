'use client';
import Image from 'next/image';
import { Mail } from 'lucide-react';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="bg-white rounded-2xl shadow-lg border p-12 w-full max-w-md text-center" style={{ borderColor: 'var(--border)' }}>
        <h1 className="text-2xl font-semibold tracking-wide mb-6" style={{ color: 'var(--primary)' }}>WELCOME TO</h1>
        <Image src="/quanta_logo.png" alt="Quanta" width={256} height={128} className="h-32 w-auto mx-auto mb-6" priority />
        <p className="text-sm mb-10" style={{ color: 'var(--text-secondary)' }}>Hospitality Business Intelligence</p>
        <button
          onClick={() => signIn('azure-ad', { callbackUrl: '/dashboard' })}
          className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90 hover:shadow-md"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <Mail size={20} />
          Sign in with corporate email
        </button>
      </div>
    </div>
  );
}
