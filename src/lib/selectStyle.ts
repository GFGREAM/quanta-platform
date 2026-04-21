// Shared inline style for native <select> elements across the dashboard.
// Kept in /lib because three different dashboard pages render the same
// bordered + chevron-iconed dropdown and we don't want drifting copies.
export const selectStyle = {
  borderColor: 'var(--border)',
  color: 'var(--primary)',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23172951' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
} as const;
