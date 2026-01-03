"use client";

import { useEffect, useMemo, useState } from "react";
import { ReportsApi, InventoryApi } from "@/app/lib/api";
import type {
  RevenueReportResponse,
  ServicesRevenueReportResponse,
  InventoryOutReportResponse,
} from "@/app/lib/types";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

function formatMoney(value: number) {
  return value.toLocaleString("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  });
}

function downloadCsv(url: string) {
  if (typeof window === "undefined") return;
  window.location.href = url;
}

function useDateRange() {
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  return { from, to, setFrom, setTo };
}

type MasterUtilItem = {
  masterId: number;
  masterName: string;
  appointmentsCount: number;
  bookedMinutes: number;
  availableMinutes: number;
  utilization: number;
};

type OwnerDashboardStats = {
  range: { from: string; to: string };
  finance: {
    totalRevenue: number;
    totalCompleted: number;
    avgCheck: number;
    cogsTotal: number;
    grossProfit: number;
    grossMargin: number;
  };
  appointments: {
    totalAppointments: number;
    noShowRate: number;
    cancelRate: number;
  };
  masters: {
    items: MasterUtilItem[];
  };
  clients: {
    summary: {
      newCount: number;
      newRevenue: number;
      repeatCount: number;
      repeatRevenue: number;
      riskCount: number;
      totalClientsInRange: number;
      repeatClientsInRange: number;
      newRetainedWithin90Days: number;
    };
  };
};

function AiFinanceSummary({ from, to }: { from: string; to: string }) {
  const [stats, setStats] = useState<OwnerDashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!from || !to) return;
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ from, to });
        const res = await fetch(
          `${BACKEND_BASE_URL}/api/stats/owner-dashboard?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as {
          success: boolean;
          data: OwnerDashboardStats;
          error?: string;
        };
        if (!json.success) {
          throw new Error(json.error || "Failed to load stats");
        }
        setStats(json.data);
      } catch (e: any) {
        if (e.name === "AbortError") return;
        setError(e.message || "Ошибка загрузки аналитики");
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [from, to]);

  if (!from || !to) return null;

  if (loading && !stats) {
    return (
      <div className="mt-4 rounded-md border p-4 text-sm text-gray-600">
        Анализ периода…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
        Не удалось получить данные для анализа: {error}
      </div>
    );
  }

  if (!stats) return null;

  const { finance, appointments, masters, clients } = stats;

  const highlights: string[] = [];
  const risks: string[] = [];
  const actions: string[] = [];

  if (finance.totalRevenue > 0) {
    highlights.push(
      `Выручка за период составила ${Math.round(
        finance.totalRevenue,
      ).toLocaleString("ru-RU")} ₽ при среднем чеке ${Math.round(
        finance.avgCheck || 0,
      ).toLocaleString("ru-RU")} ₽.`,
    );
  }

  if (finance.grossMargin > 0) {
    highlights.push(
      `Маржа около ${(finance.grossMargin * 100).toFixed(
        1,
      )}% — базовый ориентир по прибыльности за этот период.`,
    );
  }

  const avgUtil =
    masters.items.length > 0
      ? masters.items.reduce((sum, m) => sum + m.utilization, 0) /
        masters.items.length
      : 0;

  if (masters.items.length > 0) {
    highlights.push(
      `Средняя загрузка мастеров около ${(avgUtil * 100).toFixed(
        1,
      )}% за выбранный период.`,
    );
  }

  if (appointments.noShowRate > 0.1) {
    risks.push(
      `Доля no-show ${(appointments.noShowRate * 100).toFixed(
        1,
      )}% — выше желательной зоны 10%.`,
    );
    actions.push(
      "Стоит усилить напоминания и рассмотреть предоплаты для рискованных слотов и клиентов.",
    );
  }

  if (finance.grossMargin < 0.4 && finance.totalRevenue > 0) {
    risks.push(
      `Маржа всего ${(finance.grossMargin * 100).toFixed(
        1,
      )}% — себестоимость материалов съедает значимую часть выручки.`,
    );
    actions.push(
      "Проверить цены, скидки и расходники по ключевым услугам, особенно с низкой маржой.",
    );
  }

  if (clients.summary.totalClientsInRange > 0) {
    const repeatShare =
      clients.summary.totalClientsInRange > 0
        ? (clients.summary.repeatClientsInRange /
            clients.summary.totalClientsInRange) *
          100
        : 0;
    highlights.push(
      `За период обслужено ${clients.summary.totalClientsInRange} клиентов, доля повторных примерно ${repeatShare.toFixed(
        1,
      )}%.`,
    );
    if (repeatShare < 35) {
      risks.push(
        "Доля повторных клиентов ниже ориентирной отметки 35% — есть потенциал усилить удержание.",
      );
      actions.push(
        "Добавить простые сценарии rebooking и напоминаний после визита для повышения повторных записей.",
      );
    }
  }

  if (masters.items.some((m) => m.utilization < 0.6)) {
    const lowNames = masters.items
      .filter((m) => m.utilization < 0.6)
      .map((m) => m.masterName)
      .join(", ");
    risks.push(
      `Есть мастера с загрузкой ниже 60%: ${lowNames}. Их рабочее время используется неэффективно.`,
    );
    actions.push(
      "Рассмотреть перераспределение записей и промо-активности именно под этих мастеров.",
    );
  }

  return (
    <div className="mt-6 rounded-md border bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-gray-800">
        Аналитика периода (управленческий комментарий)
      </h3>
      {highlights.length > 0 && (
        <div className="mb-3">
          <div className="mb-1 text-xs font-medium text-gray-500">
            Кратко о периоде
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-800">
            {highlights.map((h, idx) => (
              <li key={`hl-${idx}`}>{h}</li>
            ))}
          </ul>
        </div>
      )}
      {risks.length > 0 && (
        <div className="mb-3">
          <div className="mb-1 text-xs font-medium text-gray-500">
            Зоны риска
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-800">
            {risks.map((r, idx) => (
              <li key={`risk-${idx}`}>{r}</li>
            ))}
          </ul>
        </div>
      )}
      {actions.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-medium text-gray-500">
            Что можно сделать
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-800">
            {actions.map((a, idx) => (
              <li key={`act-${idx}`}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      {highlights.length === 0 && risks.length === 0 && (
        <p className="text-sm text-gray-500">
          За выбранный период данных немного, поэтому сделать выводы пока
          сложно.
        </p>
      )}
    </div>
  );
}

export default function FinanceReportsPage() {
  const { from, to, setFrom, setTo } = useDateRange();
  const [loading, setLoading] = useState(false);
  const [revenueReport, setRevenueReport] =
    useState<RevenueReportResponse | null>(null);
  const [servicesReport, setServicesReport] =
    useState<ServicesRevenueReportResponse | null>(null);
  const [inventoryOut, setInventoryOut] =
    useState<InventoryOutReportResponse | null>(null);

  useEffect(() => {
    async function load() {
      if (!from || !to) return;
      try {
        setLoading(true);
        const [rev, srv, inv] = await Promise.all([
          ReportsApi.getRevenueReport({ from, to }),
          ReportsApi.getServicesRevenueReport({ from, to }),
          InventoryApi.getOutReport({ from, to }),
        ]);
        setRevenueReport(rev);
        setServicesReport(srv);
        setInventoryOut(inv);
      } catch (e) {
        console.error("Failed to load finance reports", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [from, to]);

  const grossProfit = useMemo(() => {
    const revenue = revenueReport?.totalRevenue ?? 0;
    const cogs =
      inventoryOut?.items.reduce(
        (sum, row) => sum + (row.approxCost ?? 0),
        0,
      ) ?? 0;
    return revenue - cogs;
  }, [revenueReport, inventoryOut]);

  const grossMargin = useMemo(() => {
    const revenue = revenueReport?.totalRevenue ?? 0;
    if (revenue <= 0) return 0;
    return grossProfit / revenue;
  }, [grossProfit, revenueReport]);

  const handleExportFinance = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    downloadCsv(
      `${BACKEND_BASE_URL}/api/export/finance?${params.toString()}`,
    );
  };

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Финансы и прибыль
          </h1>
          <p className="text-sm text-gray-500">
            Выручка, расход склада и прибыль за период с учётом ручных
            расходов.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">С:</label>
            <input
              type="date"
              className="rounded border px-2 py-1 text-xs"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <label className="text-xs text-gray-500">По:</label>
            <input
              type="date"
              className="rounded border px-2 py-1 text-xs"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
  type="button"
  onClick={handleExportFinance}
  disabled={!from || !to}
  className="rounded border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 md:text-sm"
>
  Экспорт записей и расходников (CSV)
</button>

          </div>
        </div>
      </header>

      {loading && !revenueReport && (
        <div className="text-sm text-gray-500">Загрузка отчёта…</div>
      )}

      {!loading && revenueReport && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-md border bg-white p-4">
              <div className="text-xs text-gray-500">Выручка (COMPLETED)</div>
              <div className="mt-1 text-lg font-semibold">
                {formatMoney(revenueReport.totalRevenue)}
              </div>
            </div>
            <div className="rounded-md border bg-white p-4">
              <div className="text-xs text-gray-500">COGS (материалы)</div>
              <div className="mt-1 text-lg font-semibold">
                {formatMoney(
                  inventoryOut?.items.reduce(
                    (sum, row) => sum + (row.approxCost ?? 0),
                    0,
                  ) ?? 0,
                )}
              </div>
            </div>
            <div className="rounded-md border bg-white p-4">
              <div className="text-xs text-gray-500">Валовая прибыль</div>
              <div className="mt-1 text-lg font-semibold">
                {formatMoney(grossProfit)}
              </div>
            </div>
            <div className="rounded-md border bg-white p-4">
              <div className="text-xs text-gray-500">Маржа</div>
              <div className="mt-1 text-lg font-semibold">
                {(grossMargin * 100).toFixed(1)}%
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold">
                Выручка по мастерам
              </h2>
              {revenueReport.items.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Нет завершённых записей за период.
                </p>
              ) : (
                <table className="w-full border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-1 pr-2">Мастер</th>
                      <th className="py-1 pr-2">Выручка</th>
                      <th className="py-1 pr-2">Записей (COMPLETED)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueReport.items.map((row) => (
                      <tr
                        key={row.masterId}
                        className="border-b last:border-0"
                      >
                        <td className="py-1 pr-2">{row.masterName}</td>
                        <td className="py-1 pr-2">
                          {formatMoney(row.revenue)}
                        </td>
                        <td className="py-1 pr-2">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-md border bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold">
                Расход материалов (COGS)
              </h2>
              {inventoryOut?.items.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Нет списаний материалов за период.
                </p>
              ) : (
                <table className="w-full border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-1 pr-2">Категория</th>
                      <th className="py-1 pr-2">Списано (кол-во)</th>
                      <th className="py-1 pr-2">Примерная себестоимость</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryOut?.items.map((row) => (
                      <tr
                        key={row.category}
                        className="border-b last:border-0"
                      >
                        <td className="py-1 pr-2">{row.category}</td>
                        <td className="py-1 pr-2">
                          {row.totalQuantity.toLocaleString("ru-RU")}
                        </td>
                        <td className="py-1 pr-2">
                          {row.approxCost != null
                            ? formatMoney(row.approxCost)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="rounded-md border bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold">
              Выручка по услугам и категориям
            </h2>
            {!servicesReport || servicesReport.byService.length === 0 ? (
              <p className="text-sm text-gray-500">
                Нет данных по услугам за период.
              </p>
            ) : (
              <>
                <div className="mb-3">
                  <h3 className="mb-1 text-xs font-medium text-gray-500">
                    По услугам
                  </h3>
                  <table className="w-full border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-1 pr-2">Услуга</th>
                        <th className="py-1 pr-2">Категория</th>
                        <th className="py-1 pr-2">Записей</th>
                        <th className="py-1 pr-2">Выручка</th>
                        <th className="py-1 pr-2">Средний чек</th>
                        <th className="py-1 pr-2">% от выручки</th>
                      </tr>
                    </thead>
                    <tbody>
                      {servicesReport.byService.map((s) => {
                        const avg =
                          s.appointmentsCount > 0
                            ? s.totalRevenue / s.appointmentsCount
                            : 0;
                        const share =
                          servicesReport.summary.totalRevenue > 0
                            ? (s.totalRevenue /
                                servicesReport.summary.totalRevenue) *
                              100
                            : 0;
                        return (
                          <tr
                            key={s.serviceId ?? s.serviceName ?? "unknown"}
                            className="border-b last:border-0"
                          >
                            <td className="py-1 pr-2">
                              {s.serviceName || "Без названия"}
                            </td>
                            <td className="py-1 pr-2">
                              {s.serviceCategory}
                            </td>
                            <td className="py-1 pr-2">
                              {s.appointmentsCount}
                            </td>
                            <td className="py-1 pr-2">
                              {formatMoney(s.totalRevenue)}
                            </td>
                            <td className="py-1 pr-2">
                              {formatMoney(avg)}
                            </td>
                            <td className="py-1 pr-2">
                              {share.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="mb-1 text-xs font-medium text-gray-500">
                    По категориям услуг
                  </h3>
                  <table className="w-full border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-1 pr-2">Категория</th>
                        <th className="py-1 pr-2">Записей</th>
                        <th className="py-1 pr-2">Выручка</th>
                        <th className="py-1 pr-2">Средний чек</th>
                        <th className="py-1 pr-2">% от выручки</th>
                      </tr>
                    </thead>
                    <tbody>
                      {servicesReport.byCategory.map((c) => {
                        const avg =
                          c.appointmentsCount > 0
                            ? c.totalRevenue / c.appointmentsCount
                            : 0;
                        const share =
                          servicesReport.summary.totalRevenue > 0
                            ? (c.totalRevenue /
                                servicesReport.summary.totalRevenue) *
                              100
                            : 0;
                        return (
                          <tr
                            key={c.category}
                            className="border-b last:border-0"
                          >
                            <td className="py-1 pr-2">{c.category}</td>
                            <td className="py-1 pr-2">
                              {c.appointmentsCount}
                            </td>
                            <td className="py-1 pr-2">
                              {formatMoney(c.totalRevenue)}
                            </td>
                            <td className="py-1 pr-2">
                              {formatMoney(avg)}
                            </td>
                            <td className="py-1 pr-2">
                              {share.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <AiFinanceSummary from={from} to={to} />
        </>
      )}
    </main>
  );
}
