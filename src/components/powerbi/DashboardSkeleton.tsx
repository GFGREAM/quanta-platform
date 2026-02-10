export default function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-20 rounded" style={{ backgroundColor: 'var(--border)' }} />
        <div className="h-4 w-4 rounded" style={{ backgroundColor: 'var(--border)' }} />
        <div className="h-4 w-16 rounded" style={{ backgroundColor: 'var(--border)' }} />
        <div className="h-4 w-4 rounded" style={{ backgroundColor: 'var(--border)' }} />
        <div className="h-4 w-24 rounded" style={{ backgroundColor: 'var(--border)' }} />
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="h-7 w-48 rounded" style={{ backgroundColor: 'var(--border)' }} />
        <div className="flex gap-2">
          <div className="h-9 w-9 rounded-lg" style={{ backgroundColor: 'var(--muted)' }} />
          <div className="h-9 w-9 rounded-lg" style={{ backgroundColor: 'var(--muted)' }} />
          <div className="h-9 w-9 rounded-lg" style={{ backgroundColor: 'var(--muted)' }} />
        </div>
      </div>
      <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border)', minHeight: 'calc(100vh - 220px)' }}>
        <div className="flex gap-4 mb-6">
          <div className="h-8 w-24 rounded" style={{ backgroundColor: 'var(--muted)' }} />
          <div className="h-8 w-24 rounded" style={{ backgroundColor: 'var(--muted)' }} />
          <div className="h-8 w-24 rounded" style={{ backgroundColor: 'var(--muted)' }} />
        </div>
        <div className="h-64 w-full rounded-lg mb-4" style={{ backgroundColor: 'var(--muted)' }} />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-32 rounded-lg" style={{ backgroundColor: 'var(--muted)' }} />
          <div className="h-32 rounded-lg" style={{ backgroundColor: 'var(--muted)' }} />
          <div className="h-32 rounded-lg" style={{ backgroundColor: 'var(--muted)' }} />
        </div>
      </div>
    </div>
  );
}
