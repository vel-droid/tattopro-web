import React from "react";

const clients = [
  {
    id: 1,
    name: "Иван Иванов",
    contact: "+7 915 123-45-67",
    status: "active",
    lastVisit: "2025-11-26",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
  },
  {
    id: 2,
    name: "Елена Смирнова",
    contact: "+7 911 678-90-12",
    status: "inactive",
    lastVisit: "2025-10-02",
    avatar: "https://randomuser.me/api/portraits/women/2.jpg",
  },
];

function getStatusColor(status: string) {
  return status === "active" ? "bg-clientActive" : "bg-clientInactive";
}

const ClientList: React.FC = () => (
  <div>
    <h2 className="text-xl font-bold mb-4">Клиенты</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((client) => (
        <div key={client.id} className="bg-white rounded-lg shadow p-4 flex items-center">
          <img src={client.avatar} alt={client.name} className="w-12 h-12 rounded-full mr-4" />
          <div className="flex-1">
            <div className="font-bold">{client.name}</div>
            <div className="text-gray-500 text-sm">{client.contact}</div>
            <div className="text-xs text-gray-400">
              Последний визит: {client.lastVisit}
            </div>
          </div>
          <div className={`w-3 h-3 rounded-full ${getStatusColor(client.status)}`} title={client.status}></div>
        </div>
      ))}
    </div>
  </div>
);

export default ClientList;
