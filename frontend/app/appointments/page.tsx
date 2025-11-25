'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Appointment {
  id: string;
  clientName: string;
  service: string;
  date: string;
  time: string;
  status: 'confirmed' | 'pending' | 'completed';
  price: string;
}

export default function Appointments() {
  const [appointments] = useState<Appointment[]>([
    {
      id: '1',
      clientName: 'Ivan Petrov',
      service: 'Sleeve Tattoo',
      date: 'Today',
      time: '10:00 AM',
      status: 'confirmed',
      price: '$150',
    },
    {
      id: '2',
      clientName: 'Maria K.',
      service: 'Small Tattoo',
      date: 'Today',
      time: '2:30 PM',
      status: 'confirmed',
      price: '$50',
    },
    {
      id: '3',
      clientName: 'Dmitri Z.',
      service: 'Cover-up',
      date: 'Tomorrow',
      time: '11:00 AM',
      status: 'pending',
      price: '$200',
    },
    {
      id: '4',
      clientName: 'Elena R.',
      service: 'Consultation',
      date: 'Nov 27',
      time: '3:00 PM',
      status: 'pending',
      price: 'Free',
    },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
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
        {/* Calendar Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">Today's Appointments</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">2</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">Pending Confirmations</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">2</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">This Week's Revenue</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">$750</div>
          </div>
        </div>

        {/* Appointments List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {appointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">
                    {appointment.clientName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {appointment.service}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {appointment.date} at {appointment.time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">
                    {appointment.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
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
