import { redirect } from 'next/navigation';

export default function Home() {
  // Local-dev only: skip the Azure AD login and land straight on the dashboard.
  if (process.env.NODE_ENV === 'development' && process.env.AUTH_BYPASS === '1') {
    redirect('/dashboard');
  }
  redirect('/login');
}
