"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import type { ServiceCategory } from "@/app/lib/types";
import { ReportsApi, MasterApi } from "@/app/lib/api";

type Master = {
  id: number;
  fullName: string;
};

type ServiceRevenueItem = {
  serviceId: number | null;
  serviceName: string | null;
  serviceCategory: ServiceCategory | string;
  totalRevenue: number;
  appointmentsCount: number;
};

type ServiceCategorySummary = {
  category: ServiceCategory | string;
  totalRevenue: number;
  appointmentsCount: number;
};

type ServicesRevenueResponse = {
  range: {
    from: string;
    to: string;
  };
  filters: {
    masterId: number | null;
    serviceCategory: ServiceCategory | string | null;
  };
  summary: {
    totalRevenue: number;
    totalAppointments: number;
  };
  byService: ServiceRevenueItem[];
  byCategory: ServiceCategorySummary[];
};

const formatMoney = (value: number) =>
  `${value.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} ₽`;

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function ServicesReportPage() {
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return format(d, "yyyy-MM-dd");
  });
  const [to, setTo] = useState<string>(() =>
    format(new Date(), "yyyy-MM-dd"),
  );

  const [masterId, setMasterId] = useState<number | "ALL">("ALL");
  const [serviceCategory, setServiceCategory] = useState<
    ServiceCategory | "ALL"
  >("ALL");

  const [masters, setMasters] = useState<Master[]>([]);

  const [data, setData] = useState<ServicesRevenueResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [mastersLoading, setMastersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildRange = () => {
    let fromIso: string | undefined;
    let toIso: string | undefined;

    if (from) fromIso = `${from}T00:00:00.000Z`;
    if (to) toIso = `${to}T23:59:59.999Z`;

    return { fromIso, toIso };
  };

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

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const { fromIso, toIso } = buildRange();
      if (!fromIso || !toIso) {
        setData(null);
        setLoading(false);
        return;
      }

      const params: {
        from: string;
        to: string;
        masterId?: number;
        serviceCategory?: ServiceCategory;
      } = {
        from: fromIso,
        to: toIso,
      };

      if (masterId !== "ALL") {
        params.masterId = masterId;
      }

      if (serviceCategory !== "ALL") {
        params.serviceCategory = serviceCategory as ServiceCategory;
      }

      const resp = (await ReportsApi.getServicesRevenueReport(
        params,
      )) as any;

      setData(resp as ServicesRevenueResponse);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Ошибка загрузки отчёта по услугам");
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
  }, [from, to, masterId, serviceCategory]);

  const totalRevenue = data?.summary.totalRevenue ?? 0;
  const totalAppointments = data?.summary.totalAppointments ?? 0;

  const byService = data?.byService ?? [];
  const byCategory = data?.byCategory ?? [];

  const serviceCategoriesFromData: string[] = Array.from(
    new Set(byService.map((s) => s.serviceCategory || "OTHER")),
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Отчёт по услугам
              </h1>
              <p className="text-sm text-gray-500">
                Выручка и количество записей по услугам и категориям за
                выбранный период.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/reports/overview"
              className="inline-flex items-center rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
            >
              ← К сводному отчёту
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="rounded bg-white p-4 shadow">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-700">
                Фильтры отчёта по услугам.
              </span>
            </div>
            <div className="ml-auto flex flex-wrap items-end gap-4">
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
                  Мастер
                </label>
                <select
                  value={masterId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMasterId(v === "ALL" ? "ALL" : Number(v));
                  }}
                  className="w-48 rounded border px-3 py-2 text-sm"
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
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Категория услуги
                </label>
                <select
                  value={serviceCategory}
                  onChange={(e) => {
                    const v = e.target.value as ServiceCategory | "ALL";
                    setServiceCategory(v);
                  }}
                  className="w-48 rounded border px-3 py-2 text-sm"
                >
                  <option value="ALL">Все категории</option>
                  {serviceCategoriesFromData.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-gray-500">
                {loading
                  ? "Загрузка…"
                  : `Период: ${
                      from
                        ? format(new Date(from), "d MMM yyyy", { locale: ru })
                        : "—"
                    } — ${
                      to
                        ? format(new Date(to), "d MMM yyyy", { locale: ru })
                        : "—"
                    }`}
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded bg-red-100 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="flex flex-wrap gap-4">
          <div className="min-w-[220px] flex-1 rounded bg-white p-4 shadow">
            <div className="text-xs text-gray-500">
              Выручка по услугам
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {formatMoney(totalRevenue)}
            </div>
          </div>
          <div className="min-w-[220px] flex-1 rounded bg-white p-4 shadow">
            <div className="text-xs text-gray-500">
              Записей по услугам
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {totalAppointments}
            </div>
          </div>
        </section>

        <section className="space-y-2 rounded bg-white p-4 shadow">
          <h2 className="text-sm font-semibold text-gray-800">
            Услуги
          </h2>
          <p className="text-xs text-gray-500">
            Детализированная выручка и количество записей по каждой
            услуге.
          </p>

          {byService.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    Услуга
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    Категория
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Записей
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Выручка
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Средний чек
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byService.map((item, idx) => {
                  const avg =
                    item.appointmentsCount > 0
                      ? item.totalRevenue / item.appointmentsCount
                      : 0;
                  return (
                    <tr key={item.serviceId ?? `svc-${idx}`}>
                      <td className="px-3 py-2 text-gray-900">
                        {item.serviceName ?? "Без названия"}
                      </td>
                      <td className="px-3 py-2 text-gray-900">
                        {item.serviceCategory ?? "OTHER"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {item.appointmentsCount}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {formatMoney(item.totalRevenue)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {item.appointmentsCount > 0
                          ? formatMoney(avg)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : !loading ? (
            <p className="text-xs text-gray-500">
              Нет данных по услугам за выбранный период.
            </p>
          ) : null}
        </section>

        <section className="space-y-2 rounded bg-white p-4 shadow">
          <h2 className="text-sm font-semibold text-gray-800">
            По категориям услуг
          </h2>
          <p className="text-xs text-gray-500">
            Как распределяется выручка и количество записей по
            категориям услуг.
          </p>

          {byCategory.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    Категория
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Записей
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Выручка
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Средний чек
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byCategory.map((row) => {
                  const avg =
                    row.appointmentsCount > 0
                      ? row.totalRevenue / row.appointmentsCount
                      : 0;
                  const share =
                    totalRevenue > 0
                      ? row.totalRevenue / totalRevenue
                      : 0;
                  return (
                    <tr key={row.category}>
                      <td className="px-3 py-2 text-gray-900">
                        {row.category ?? "OTHER"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {row.appointmentsCount}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {formatMoney(row.totalRevenue)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {row.appointmentsCount > 0
                          ? formatMoney(avg)
                          : "—"}{" "}
                        <span className="ml-2 text-[10px] text-gray-500">
                          {formatPercent(share)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : !loading ? (
            <p className="text-xs text-gray-500">
              Нет данных по категориям услуг за выбранный период.
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
