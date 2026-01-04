// app/(dashboard)/clients/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";

import {
  ClientApi,
} from "../../lib/api";
import type {
  Client,
  ClientStatus,
} from "../../lib/types";
import ToastContainer, { type ToastItem } from "../../components/Toast";

type FilterState = {
  search?: string;
  status?: ClientStatus | "ALL";
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "ALL",
  });

  const [toastItems, setToastItems] = useState<ToastItem[]>([]);

  const loadClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ClientApi.getAll();
      setClients(data);
    } catch (e: any) {
      console.error(e);
      const msg = e.message || "Не удалось загрузить клиентов";
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    const id = Date.now().toString();
    setToastItems((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToastItems((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const showSuccess = (message: string) => showToast("success", message);
  const showError = (message: string) => showToast("error", message);

  const handleRemoveToast = (id: string) => {
    setToastItems((prev) => prev.filter((t) => t.id !== id));
  };

  const handleStatusChange = async (client: Client, status: ClientStatus) => {
  try {
    await ClientApi.update(client.id, { status });
    showSuccess("Статус клиента обновлён");
    await loadClients();
  } catch (e: any) {
    console.error(e);
    showError(e.message || "Ошибка обновления статуса клиента");
  }
};

  const handleBlockToggle = async (client: Client) => {
  try {
    await ClientApi.update(client.id, { isBlocked: !client.isBlocked });
    showSuccess(
      client.isBlocked ? "Клиент разблокирован" : "Клиент заблокирован",
    );
    await loadClients();
  } catch (e: any) {
    console.error(e);
    showError(e.message || "Ошибка изменения блокировки клиента");
  }
};

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const byStatus =
        !filters.status || filters.status === "ALL"
          ? true
          : c.status === filters.status;

      const search = filters.search?.trim().toLowerCase() ?? "";
      const bySearch = !search
        ? true
        : c.fullName.toLowerCase().includes(search) ||
          (c.phone ?? "").toLowerCase().includes(search) ||
          (c.email ?? "").toLowerCase().includes(search);

      return byStatus && bySearch;
    });
  }, [clients, filters]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">Клиенты</h1>
            <Link
              href="/dashboard"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ← Назад к дашборду
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Поиск по имени, телефону, email"
              value={filters.search ?? ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="w-64 rounded border px-3 py-2 text-sm"
            />
            <select
              value={filters.status ?? "ALL"}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as ClientStatus | "ALL",
                }))
              }
              className="min-w-[140px] rounded border px-3 py-2 text-sm"
            >
              <option value="ALL">Все</option>
              <option value="REGULAR">Обычный</option>
              <option value="VIP">VIP</option>
              <option value="RISK">Риск</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-6 space-y-4">
        {error && (
          <div className="rounded bg-red-100 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Имя
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Телефон
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Email
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Статус
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  No-show
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Заметки
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-center text-sm text-gray-500"
                  >
                    Загрузка...
                  </td>
                </tr>
              )}

              {!loading && filteredClients.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-center text-sm text-gray-500"
                  >
                    Клиентов по текущим фильтрам не найдено.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">
                        {client.fullName}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {client.id}
                      </div>
                    </td>
                    <td className="px-3 py-2">{client.phone}</td>
                    <td className="px-3 py-2">{client.email}</td>
                    <td className="px-3 py-2">
                      {client.status === "REGULAR"
                        ? "Обычный"
                        : client.status === "VIP"
                        ? "VIP"
                        : "Риск"}
                    </td>
                    <td className="px-3 py-2">{client.noShowCount}</td>
                    <td className="px-3 py-2 max-w-xs">
                      <span className="line-clamp-2 text-xs text-gray-600">
                        {client.notes}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <select
                          value={client.status}
                          onChange={(e) =>
                            void handleStatusChange(
                              client,
                              e.target.value as ClientStatus,
                            )
                          }
                          className="rounded border px-2 py-1 text-xs"
                        >
                          <option value="REGULAR">Обычный</option>
                          <option value="VIP">VIP</option>
                          <option value="RISK">Риск</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => void handleBlockToggle(client)}
                          className={`rounded px-2 py-1 text-xs ${
                            client.isBlocked
                              ? "bg-green-600 text-white"
                              : "bg-red-600 text-white"
                          }`}
                        >
                          {client.isBlocked ? "Разблокировать" : "Заблокировать"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </main>

      <ToastContainer toasts={toastItems} onClose={handleRemoveToast} />
    </div>
  );
}
