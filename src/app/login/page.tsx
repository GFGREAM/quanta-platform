'use client';
import { Mail } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="bg-white rounded-2xl shadow-lg border p-12 w-full max-w-md text-center" style={{ borderColor: 'var(--border)' }}>
        <img src="/quanta_logo.png" alt="Quanta" className="h-28 mx-auto mb-8" />
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--primary)' }}>Bienvenido a Quanta</h1>
        <p className="text-sm mb-10" style={{ color: 'var(--text-secondary)' }}>Plataforma de Business Intelligence</p>
        <button onClick={() => window.location.href = '/dashboard'} className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90 hover:shadow-md" style={{ backgroundColor: 'var(--accent)' }}>
          <Mail size={20} />
          Iniciar sesión con correo
        </button>
        <p className="text-xs mt-10 italic tracking-wide" style={{ color: 'var(--text-secondary)' }}>by GFG AM</p>
      </div>
    </div>
  );
}
