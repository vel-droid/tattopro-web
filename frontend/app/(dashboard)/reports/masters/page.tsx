"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import type { AppointmentStatus, Master } from "../../../lib/types";
import { AppointmentApi, MasterApi } from "../../../lib/api";

type MasterRow = {
  masterId: number;
  masterName: string;
  totalAppointments: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  revenue: number;
  avgCheck: number;
  totalDurationHours: number;
};

type StatusFilter = "ALL" | "ACTIVE_ONLY";

const DEFAULT_STATUSES_FOR_REVENUE: AppointmentStatus[] = [
  "APPROVED",
  "COMPLETED",
];

export default function MastersReportPage() {
  const [masters, setMasters] = useState<Master[]>([]);
  const [rows, setRows] = useState<MasterRow[]>([]);
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return format(d, "yyyy-MM-dd");
  });
  const [to, setTo] = useState<string>(() =>
    format(new Date(), "yyyy-MM-dd"),
  );
  const [statusMode, setStatusMode] = useState<StatusFilter>("ACTIVE_ONLY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMasters = async () => {
    try {
      const allMasters = await MasterApi.getAll();
      setMasters(allMasters);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Ошибка загрузки мастеров");
    }
  };

  const buildRange = () => {
    let fromIso: string | undefined;
    let toIso: string | undefined;

    if (from) {
      fromIso = `${from}T00:00:00.000Z`;
    }
    if (to) {
      toIso = `${to}T23:59:59.999Z`;
    }
    return { fromIso, toIso };
  };

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const { fromIso, toIso } = buildRange();

      // грузим всех мастеров
      const allMasters = masters.length ? masters : await MasterApi.getAll();

      // для отчёта можно фильтровать только активных мастеров
      const usedMasters =
        statusMode === "ACTIVE_ONLY"
          ? allMasters.filter((m) => m.isActive)
          : allMasters;

      const rowsResult: MasterRow[] = [];

      // для простоты: один запрос /api/appointments на мастера
      for (const m of usedMasters) {
        const params: any = {
          limit: 10000,
          offset: 0,
          masterId: m.id,
        };
        if (fromIso) params.from = fromIso;
        if (toIso) params.to = toIso;

        const res = await AppointmentApi.getAppointments(params);

        const items = res.items;

        let totalAppointments = items.length;
        let completedCount = 0;
        let cancelledCount = 0;
        let noShowCount = 0;
        let revenue = 0;
        let totalDurationMinutes = 0;

        for (const a of items) {
          if (a.status === "COMPLETED") completedCount += 1;
          if (a.status === "CANCELLED") cancelledCount += 1;
          if (a.status === "NO_SHOW") noShowCount += 1;

          if (DEFAULT_STATUSES_FOR_REVENUE.includes(a.status)) {
            revenue += a.price;
          }

          const start = new Date(a.startsAt).getTime();
          const end = new Date(a.endsAt).getTime();
          const diffMinutes = Math.max(
            0,
            Math.round((end - start) / (60 * 1000)),
          );
          totalDurationMinutes += diffMinutes;
        }

        const effectiveForAvg =
          items.filter((a) =>
            DEFAULT_STATUSES_FOR_REVENUE.includes(a.status),
          ).length || 0;
        const avgCheck =
          effectiveForAvg > 0 ? revenue / effectiveForAvg : 0;
        const totalDurationHours = totalDurationMinutes / 60;

        rowsResult.push({
          masterId: m.id,
          masterName: m.fullName,
          totalAppointments,
          completedCount,
          cancelledCount,
          noShowCount,
          revenue,
          avgCheck,
          totalDurationHours,
        });
      }

      setRows(rowsResult);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Ошибка загрузки отчёта по мастерам");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMasters();
  }, []);

  useEffect(() => {
    void loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, statusMode, masters.length]);

  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
  const totalAppointments = rows.reduce(
    (sum, r) => sum + r.totalAppointments,
    0,
  );
  const totalCompleted = rows.reduce(
    (sum, r) => sum + r.completedCount,
    0,
  );
  const totalNoShow = rows.reduce(
    (sum, r) => sum + r.noShowCount,
    0,
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">
              Отчёт по мастерам
            </h1>
            <Link
              href="/dashboard"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ← Назад к дашборду
            </Link>
            <Link
              href="/appointments"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Журнал записей
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        {/* Фильтры */}
        <div className="flex flex-wrap items-end gap-4 rounded bg-white p-4 shadow">
          <div>
            <label className="mb-1 block text-sm font-medium">С даты</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">По дату</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Мастера
            </label>
            <select
              value={statusMode}
              onChange={(e) =>
                setStatusMode(e.target.value as StatusFilter)
              }
              className="rounded border px-3 py-2 text-sm"
            >
              <option value="ACTIVE_ONLY">Только активные</option>
              <option value="ALL">Все мастера</option>
            </select>
          </div>

          <div className="ml-auto text-sm text-gray-600">
            {loading ? "Загрузка..." : `Мастеров в отчёте: ${rows.length}`}
          </div>
        </div>

        {/* Сводка */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded bg-white p-4 shadow">
            <div className="text-xs text-gray-500">Выручка</div>
            <div className="mt-1 text-lg font-semibold">
              {totalRevenue.toLocaleString("ru-RU")} ₽
            </div>
          </div>
          <div className="rounded bg-white p-4 shadow">
            <div className="text-xs text-gray-500">Всего записей</div>
            <div className="mt-1 text-lg font-semibold">
              {totalAppointments}
            </div>
          </div>
          <div className="rounded bg-white p-4 shadow">
            <div className="text-xs text-gray-500">
              Завершённые записи
            </div>
            <div className="mt-1 text-lg font-semibold">
              {totalCompleted}
            </div>
          </div>
          <div className="rounded bg-white p-4 shadow">
            <div className="text-xs text-gray-500">No-show</div>
            <div className="mt-1 text-lg font-semibold">
              {totalNoShow}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded bg-red-100 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Таблица мастеров */}
        <div className="overflow-x-auto rounded bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Мастер
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Записей
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Завершено
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Отменено
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  No-show
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Выручка, ₽
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Ср. чек, ₽
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Часы по записям
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((r) => (
                <tr key={r.masterId}>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-900">
                    {r.masterName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right text-gray-900">
                    {r.totalAppointments}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right text-emerald-700">
                    {r.completedCount}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right text-amber-700">
                    {r.cancelledCount}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right text-red-700">
                    {r.noShowCount}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right text-gray-900">
                    {r.revenue.toLocaleString("ru-RU")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right text-gray-900">
                    {Math.round(r.avgCheck).toLocaleString("ru-RU")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right text-gray-900">
                    {r.totalDurationHours.toFixed(1)}
                  </td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-4 text-center text-xs text-gray-500"
                  >
                    Нет данных за выбранный период.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
