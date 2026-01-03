"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

type ServiceReportItem = {
  serviceId: number | null;
  serviceName: string | null;
  serviceCategory: string;
  appointmentsCount: number;
  totalRevenue: number;
};

type CategoryReportItem = {
  category: string;
  appointmentsCount: number;
  totalRevenue: number;
};

type ServicesReportResponse = {
  range: {
    from: string;
    to: string;
  };
  summary: {
    totalRevenue: number;
    totalAppointments: number;
  };
  byService: ServiceReportItem[];
  byCategory: CategoryReportItem[];
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

const defaultFrom = () => format(new Date(), "yyyy-MM-01");
const defaultTo = () => format(new Date(), "yyyy-MM-dd");

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function ServicesReportPage() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ServicesReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        from,
        to,
      });

      const res = await fetch(
        `${API_BASE}/api/reports/services?${params.toString()}`,
      );
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Не удалось загрузить отчёт");
      }

      setData(json.data as ServicesReportResponse);
    } catch (e: any) {
      setError(e.message || "Ошибка загрузки");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalRevenue = data?.summary.totalRevenue ?? 0;
  const totalCount = data?.summary.totalAppointments ?? 0;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Отчёт по услугам</h1>

      <div className="flex gap-3 items-end">
        <div className="flex flex-col">
          <label className="text-sm mb-1">От</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">До</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-2 rounded bg-black text-white text-sm disabled:opacity-50"
        >
          {loading ? "Загрузка..." : "Обновить"}
        </button>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      {data && (
        <>
          <div className="space-y-1">
            <div>
              Период: {data.range.from.slice(0, 10)} —{" "}
              {data.range.to.slice(0, 10)}
            </div>
            <div>Всего записей: {totalCount}</div>
            <div>Общая выручка: {formatMoney(totalRevenue)}</div>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold mt-4">По услугам</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-2">Услуга</th>
                    <th className="text-left py-2 pr-2">Категория</th>
                    <th className="py-2 px-2 text-right">Записей</th>
                    <th className="py-2 px-2 text-right">Выручка</th>
                    <th className="py-2 px-2 text-right">Средний чек</th>
                    <th className="py-2 px-2 text-right">% от выручки</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byService.map((s) => {
                    const avgPrice =
                      s.appointmentsCount > 0
                        ? s.totalRevenue / s.appointmentsCount
                        : 0;
                    const share =
                      totalRevenue > 0
                        ? (s.totalRevenue / totalRevenue) * 100
                        : 0;

                    return (
                      <tr
                        key={`${s.serviceId}-${s.serviceName}`}
                        className="border-b"
                      >
                        <td className="py-1 pr-2">
                          {s.serviceName || "Без названия"}
                        </td>
                        <td className="py-1 pr-2">{s.serviceCategory}</td>
                        <td className="py-1 px-2 text-right">
                          {s.appointmentsCount}
                        </td>
                        <td className="py-1 px-2 text-right">
                          {formatMoney(s.totalRevenue)}
                        </td>
                        <td className="py-1 px-2 text-right">
                          {formatMoney(avgPrice)}
                        </td>
                        <td className="py-1 px-2 text-right">
                          {share.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h2 className="text-lg font-semibold mt-6">По категориям</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-2">Категория</th>
                    <th className="py-2 px-2 text-right">Записей</th>
                    <th className="py-2 px-2 text-right">Выручка</th>
                    <th className="py-2 px-2 text-right">Средний чек</th>
                    <th className="py-2 px-2 text-right">% от выручки</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCategory.map((c) => {
                    const avgPrice =
                      c.appointmentsCount > 0
                        ? c.totalRevenue / c.appointmentsCount
                        : 0;
                    const share =
                      totalRevenue > 0
                        ? (c.totalRevenue / totalRevenue) * 100
                        : 0;

                    return (
                      <tr key={c.category} className="border-b">
                        <td className="py-1 pr-2">{c.category}</td>
                        <td className="py-1 px-2 text-right">
                          {c.appointmentsCount}
                        </td>
                        <td className="py-1 px-2 text-right">
                          {formatMoney(c.totalRevenue)}
                        </td>
                        <td className="py-1 px-2 text-right">
                          {formatMoney(avgPrice)}
                        </td>
                        <td className="py-1 px-2 text-right">
                          {share.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && !data && !error && (
        <div>Нет данных за выбранный период</div>
      )}
    </div>
  );
}
