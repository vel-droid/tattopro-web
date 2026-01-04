// app/(dashboard)/appointments/table/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { AppointmentApi } from "../../../lib/api";
import type {
  Appointment,
  AppointmentListResponse,
  AppointmentStatus,
  Client,
  Master,
} from "../../../lib/types";

type StatusFilter =
  | "ALL"
  | "PENDING"
  | "APPROVED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

const STATUS_LABELS: Record<StatusFilter, string> = {
  ALL: "Все",
  PENDING: "В ожидании",
  APPROVED: "Подтверждена",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
  NO_SHOW: "Не пришёл",
};

type Row = {
  id: number;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  masterName: string;
  status: AppointmentStatus;
  statusLabel: string;
  serviceName: string;
  price: number;
  notes: string | null;
};

export default function AppointmentsTablePage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(1000);
  const [offset] = useState(0);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        limit,
        offset,
      };

      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }

      const res = (await AppointmentApi.getAppointments(
        params,
      )) as AppointmentListResponse;

      const dataItems = res.data?.items ?? [];
      const totalCount = res.data?.total ?? 0;

      const sorted = [...dataItems].sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );

      setItems(sorted);
      setTotal(totalCount);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Не удалось загрузить записи");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset, statusFilter]);

  const rows: Row[] = useMemo(() => {
    return items.map((a) => {
      const date = format(new Date(a.startsAt), "yyyy-MM-dd");
      const time = format(new Date(a.startsAt), "HH:mm");
      const client: Client | undefined = a.client;
      const master: Master | undefined = a.master;

      const statusLabel =
        a.status === "PENDING"
          ? "В ожидании"
          : a.status === "APPROVED"
          ? "Подтверждена"
          : a.status === "COMPLETED"
          ? "Завершена"
          : a.status === "CANCELLED"
          ? "Отменена"
          : "Не пришёл";

      return {
        id: a.id,
        date,
        time,
        clientName: client?.fullName ?? "",
        clientPhone: client?.phone ?? "",
        masterName: master?.fullName ?? "",
        status: a.status,
        statusLabel,
        serviceName: a.serviceName,
        price: a.price,
        notes: a.notes ?? "",
      };
    });
  }, [items]);

  const filteredRows = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    if (!searchLower) return rows;

    return rows.filter((row) => {
      return (
        row.clientName.toLowerCase().includes(searchLower) ||
        row.clientPhone.toLowerCase().includes(searchLower) ||
        row.masterName.toLowerCase().includes(searchLower) ||
        row.serviceName.toLowerCase().includes(searchLower)
      );
    });
  }, [rows, search]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">
              Таблица записей
            </h1>
            <Link
              href="/appointments"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ← Назад к журналу
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Поиск по клиенту, телефону, мастеру, услуге"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded border px-3 py-2 text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="min-w-[140px] rounded border px-3 py-2 text-sm"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded bg-red-100 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Дата
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Время
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Клиент
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Телефон
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Мастер
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Услуга
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">
                  Цена
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Статус
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Заметки
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-4 text-center text-sm text-gray-500"
                  >
                    Загрузка...
                  </td>
                </tr>
              )}

              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-4 text-center text-sm text-gray-500"
                  >
                    Нет записей по текущим фильтрам/поиску.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2">
                      {format(new Date(row.date), "dd.MM.yyyy")}
                    </td>
                    <td className="px-3 py-2">{row.time}</td>
                    <td className="px-3 py-2">{row.clientName}</td>
                    <td className="px-3 py-2">{row.clientPhone}</td>
                    <td className="px-3 py-2">{row.masterName}</td>
                    <td className="px-3 py-2">{row.serviceName}</td>
                    <td className="px-3 py-2 text-right">
                      {row.price.toFixed(0)}
                    </td>
                    <td className="px-3 py-2">{row.statusLabel}</td>
                    <td className="px-3 py-2">{row.notes}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Показано {filteredRows.length} из {total} записей.
        </p>
      </main>
    </div>
  );
}
