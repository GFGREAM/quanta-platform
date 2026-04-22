'use client';
import Image from 'next/image';
import { Mail } from 'lucide-react';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="bg-white rounded-2xl shadow-lg border p-12 w-full max-w-md text-center" style={{ borderColor: 'var(--border)' }}>
        <Image src="/quanta_logo.png" alt="Quanta" width={224} height={112} className="h-28 w-auto mx-auto mb-8" priority />
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--primary)' }}>Bienvenido a Quanta</h1>
        <p className="text-sm mb-10" style={{ color: 'var(--text-secondary)' }}>Plataforma de Business Intelligence</p>
        <button
          onClick={() => signIn('azure-ad', { callbackUrl: '/dashboard' })}
          className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90 hover:shadow-md"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <Mail size={20} />
          Iniciar sesion con correo corporativo
        </button>
        <p className="text-xs mt-10 italic tracking-wide" style={{ color: 'var(--text-secondary)' }}>by GFG AM</p>
      </div>
    </div>
  );
}
