'use client';
import { DollarSign, Hotel, TrendingUp, BarChart3 } from 'lucide-react';

const kpiCards = [
  { title: 'RevPAR', value: '$125.40', change: '+8.2%', icon: DollarSign, positive: true },
  { title: 'Occupancy', value: '78.5%', change: '+3.1%', icon: Hotel, positive: true },
  { title: 'ADR', value: '$159.75', change: '+5.4%', icon: TrendingUp, positive: true },
  { title: 'Market Share', value: '24.3%', change: '-1.2%', icon: BarChart3, positive: false },
];

export default function DashboardHome() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--primary)' }}>Dashboard</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Resumen general de propiedades</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-5 border" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{kpi.title}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--muted)' }}><Icon size={16} style={{ color: 'var(--accent)' }} /></div>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>{kpi.value}</p>
              <p className={`text-sm mt-1 ${kpi.positive ? 'text-green-500' : 'text-red-500'}`}>{kpi.change} vs mes anterior</p>
            </div>
          );
        })}
      </div>
      <div className="bg-white rounded-xl border p-8 flex items-center justify-center" style={{ borderColor: 'var(--border)', minHeight: '400px' }}>
        <div className="text-center">
          <BarChart3 size={48} className="mx-auto mb-4" style={{ color: 'var(--border)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Power BI Dashboard</p>
          <p className="text-sm mt-1" style={{ color: 'var(--border)' }}>El dashboard se mostrará aquí cuando se integre Power BI Embedded</p>
        </div>
      </div>
    </div>
  );
}
