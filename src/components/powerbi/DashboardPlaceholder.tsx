'use client';
import { Star, RefreshCw, Maximize2, ChevronRight, BarChart } from 'lucide-react';
import { useState } from 'react';

interface DashboardPlaceholderProps {
  title: string;
  category: string;
}

export default function DashboardPlaceholder({ title, category }: DashboardPlaceholderProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  return (
    <div>
      <div className="flex items-center gap-1 text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        <span className="hover:underline cursor-pointer">Dashboard</span>
        <ChevronRight size={14} />
        <span className="hover:underline cursor-pointer">{category}</span>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--primary)' }}>{title}</span>
      </div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--primary)' }}>{title}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsFavorite(!isFavorite)} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"><Star size={18} fill={isFavorite ? 'var(--accent)' : 'none'} color={isFavorite ? 'var(--accent)' : 'var(--text-secondary)'} /></button>
          <button className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"><RefreshCw size={18} style={{ color: 'var(--text-secondary)' }} /></button>
          <button className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"><Maximize2 size={18} style={{ color: 'var(--text-secondary)' }} /></button>
        </div>
      </div>
      <div className="bg-white rounded-xl border flex items-center justify-center" style={{ borderColor: 'var(--border)', minHeight: 'calc(100vh - 220px)' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--muted)' }}><BarChart size={32} style={{ color: 'var(--border)' }} /></div>
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>{title} Dashboard</p>
          <p className="text-sm mt-1" style={{ color: 'var(--border)' }}>Power BI Embedded se conectará aquí</p>
        </div>
      </div>
    </div>
  );
}
