'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  lastVisit: string;
  status: 'active' | 'inactive';
}

export default function Clients() {
  const [clients] = useState<Client[]>([
    {
      id: '1',
      firstName: 'Maria',
      lastName: 'K.',
      email: 'maria@example.com',
      phone: '+7 999 123 45 67',
      lastVisit: '3 days ago',
      status: 'active',
    },
    {
      id: '2',
      firstName: 'Dmitri',
      lastName: 'Z.',
      email: 'dmitri@example.com',
      phone: '+7 999 876 54 32',
      lastVisit: '1 week ago',
      status: 'active',
    },
    {
      id: '3',
      firstName: 'Elena',
      lastName: 'R.',
      email: 'elena@example.com',
      phone: '+7 999 555 33 22',
      lastVisit: '2 weeks ago',
      status: 'inactive',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(
    (client) =>
      client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search clients by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Clients Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Visit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">
                    {client.firstName} {client.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{client.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{client.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{client.lastVisit}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        client.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {client.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
