"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { Appointment, AppointmentStatus, Master } from "@/app/lib/types";
import { AppointmentApi, MasterApi } from "@/app/lib/api";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

type StatusFilter = AppointmentStatus | "ALL";

const STATUS_LABELS: Record<StatusFilter, string> = {
  ALL: "Все",
  PLANNED: "Запланирована",
  APPROVED: "Подтверждена",
  COMPLETED: "Завершена",
  CANCELED: "Отменена",
  NO_SHOW: "No‑show",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatMoney(value: number) {
  return `${value.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} ₽`;
}

export default function AppointmentsTablePage() {
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );

  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [masterId, setMasterId] = useState<number | "ALL">("ALL");

  const [masters, setMasters] = useState<Master[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(200);
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(false);
  const [mastersLoading, setMastersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMasters = async () => {
    try {
      setMastersLoading(true);
      const res = (await MasterApi.getAll()) as any;
      setMasters(res as Master[]);
    } catch (e) {
      console.error(e);
    } finally {
      setMastersLoading(false);
    }
  };

  const loadAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: {
        from?: string;
        to?: string;
        masterId?: number;
        status?: AppointmentStatus | "ALL";
        limit?: number;
        offset?: number;
      } = {
        limit,
        offset,
      };

      if (from) params.from = `${from}T00:00:00.000Z`;
      if (to) params.to = `${to}T23:59:59.999Z`;
      if (masterId !== "ALL") params.masterId = masterId;
      if (status !== "ALL") params.status = status;

      const resp = (await AppointmentApi.getAppointments(
        params,
      )) as any as {
        items: Appointment[];
        total: number;
        limit: number;
        offset: number;
      };

      setAppointments(resp.items);
      setTotal(resp.total);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Ошибка загрузки записей");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMasters();
  }, []);

  useEffect(() => {
    setOffset(0);
  }, [from, to, status, masterId]);

  useEffect(() => {
    void loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, status, masterId, offset]);

  const handleExport = () => {
    const url = new URL("/api/export/appointments", BACKEND_BASE_URL);

    if (from) url.searchParams.set("from", `${from}T00:00:00.000Z`);
    if (to) url.searchParams.set("to", `${to}T23:59:59.999Z`);
    if (masterId !== "ALL") url.searchParams.set("masterId", String(masterId));
    if (status !== "ALL") url.searchParams.set("status", status);

    window.location.href = url.toString();
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Записи (таблица)
            </h1>
            <p className="text-sm text-gray-500">
              Список записей за выбранный период для анализа и экспорта.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/appointments"
              className="inline-flex items-center rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
            >
              ← К календарю записей
            </Link>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Экспорт в CSV
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <section className="rounded bg-white p-4 shadow">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                С даты
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                По дату
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Статус
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className="w-44 rounded border px-3 py-2 text-sm"
              >
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Мастер
              </label>
              <select
                value={masterId}
                onChange={(e) => {
                  const v = e.target.value;
                  setMasterId(v === "ALL" ? "ALL" : Number(v));
                }}
                className="w-52 rounded border px-3 py-2 text-sm"
                disabled={mastersLoading}
              >
                <option value="ALL">Все мастера</option>
                {masters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="ml-auto text-xs text-gray-500">
              {loading
                ? "Загрузка…"
                : `Найдено записей: ${total.toLocaleString("ru-RU")}`}
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded bg-red-100 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded bg-white p-4 shadow">
          {appointments.length === 0 && !loading ? (
            <p className="text-xs text-gray-500">
              Нет записей за выбранный период.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">
                      Дата / время
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">
                      Мастер
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">
                      Клиент
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">
                      Услуга
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">
                      Цена
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">
                      Статус
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">
                      Заметки
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {appointments.map((a) => (
                    <tr key={a.id}>
                      <td className="px-3 py-2 text-gray-900">
                        {formatDateTime(a.startsAt)}{" "}
                        <span className="text-[10px] text-gray-500">
                          до {formatDateTime(a.endsAt)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-900">
                        {a.master?.fullName ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-900">
                        {a.client?.fullName ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-900">
                        {a.serviceName}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {formatMoney(a.price)}
                      </td>
                      <td className="px-3 py-2 text-gray-900">
                        {STATUS_LABELS[a.status]}
                      </td>
                      <td className="max-w-xs px-3 py-2 text-gray-900">
                        <span className="line-clamp-2 break-words">
                          {a.notes ?? ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
            <div>
              Страница {currentPage} из {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0 || loading}
                onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
                className="rounded border px-3 py-1 disabled:opacity-40"
              >
                Назад
              </button>
              <button
                type="button"
                disabled={offset + limit >= total || loading}
                onClick={() => setOffset((prev) => prev + limit)}
                className="rounded border px-3 py-1 disabled:opacity-40"
              >
                Вперёд
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
