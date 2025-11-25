'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.firstName} {user?.lastName}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">Total Clients</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">24</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">Today's Appointments</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">5</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">Revenue (MTD)</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">$3,240</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">Pending Messages</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">8</div>
          </div>
        </div>

        {/* Quick Access */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/appointments" className="p-4 border-2 border-blue-500 rounded-lg hover:bg-blue-50 text-center font-semibold">
              📅 Appointments
            </Link>
            <Link href="/clients" className="p-4 border-2 border-green-500 rounded-lg hover:bg-green-50 text-center font-semibold">
              👥 Clients
            </Link>
            <button className="p-4 border-2 border-purple-500 rounded-lg hover:bg-purple-50 text-center font-semibold">
              💬 Messages
            </button>
            <button className="p-4 border-2 border-gray-500 rounded-lg hover:bg-gray-50 text-center font-semibold">
              ⚙️ Settings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
