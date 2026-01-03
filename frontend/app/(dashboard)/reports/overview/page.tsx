"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import type {
  AppointmentStatus,
  InventoryCategory,
} from "../../../lib/types";
import {
  AppointmentApi,
  InventoryApi,
  ReportsApi,
} from "../../../lib/api";

type MoneyByMasterItem = {
  masterId: number;
  masterName: string;
  count: number;
  revenue: number;
};

type InventoryWriteoffRow = {
  category: InventoryCategory;
  totalQuantity: number;
  approxCost: number | null;
};

type MasterUtilizationItem = {
  masterId: number;
  masterName: string;
  appointmentsCount: number;
  bookedMinutes: number;
  availableMinutes: number;
};

type LowStockItem = {
  id: number;
  name: string;
  quantity: number;
  category: InventoryCategory;
};

type StatusDistributionRow = {
  status: AppointmentStatus;
  label: string;
  count: number;
};

type ServiceRevenueItem = {
  serviceId: number | null;
  serviceName: string | null;
  serviceCategory: string;
  totalRevenue: number;
  appointmentsCount: number;
};

type ServiceCategorySummary = {
  category: string;
  totalRevenue: number;
  appointmentsCount: number;
};

const formatMoney = (value: number) =>
  `${value.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} ₽`;

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function ReportsOverviewPage() {
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return format(d, "yyyy-MM-dd");
  });
  const [to, setTo] = useState<string>(() =>
    format(new Date(), "yyyy-MM-dd"),
  );

  const [moneyByMaster, setMoneyByMaster] = useState<MoneyByMasterItem[]>(
    [],
  );
  const [inventoryWriteoffs, setInventoryWriteoffs] = useState<
    InventoryWriteoffRow[]
  >([]);
  const [masterUtilization, setMasterUtilization] = useState<
    MasterUtilizationItem[]
  >([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<
    StatusDistributionRow[]
  >([]);

  const [servicesByService, setServicesByService] = useState<
    ServiceRevenueItem[]
  >([]);
  const [servicesByCategory, setServicesByCategory] = useState<
    ServiceCategorySummary[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildRange = () => {
    let fromIso: string | undefined;
    let toIso: string | undefined;

    if (from) fromIso = `${from}T00:00:00.000Z`;
    if (to) toIso = `${to}T23:59:59.999Z`;

    return { fromIso, toIso };
  };

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const { fromIso, toIso } = buildRange();

      if (!fromIso || !toIso) {
        setMoneyByMaster([]);
        setInventoryWriteoffs([]);
        setMasterUtilization([]);
        setLowStockItems([]);
        setStatusDistribution([]);
        setServicesByService([]);
        setServicesByCategory([]);
        setLoading(false);
        return;
      }

      const [
        revenueReport,
        inventoryOutReport,
        masterUtilizationRes,
        lowStockRes,
        appointmentStats,
        servicesRevenue,
      ] = await Promise.all([
        ReportsApi.getRevenueReport({ from: fromIso, to: toIso }),
        ReportsApi.getInventoryOutReport({ from: fromIso, to: toIso }),
        ReportsApi.getMasterUtilization({ from: fromIso, to: toIso }),
        InventoryApi.getLowStock({}),
        AppointmentApi.getStats({ from: fromIso, to: toIso }),
        ReportsApi.getServicesRevenueReport({ from: fromIso, to: toIso }),
      ]);

      // выручка по мастерам
      const byMaster =
        (revenueReport as any)?.byMaster ??
        (revenueReport as any)?.items ??
        [];
      setMoneyByMaster(
        byMaster.map((row: any) => ({
          masterId: row.masterId,
          masterName: row.masterName,
          count: row.appointmentsCount ?? row.count ?? 0,
          revenue: row.revenue ?? 0,
        })),
      );

      // списания со склада
      const byCategoryRaw =
        (inventoryOutReport as any)?.byCategory ??
        (inventoryOutReport as any)?.items ??
        [];
      setInventoryWriteoffs(
        byCategoryRaw.map((row: any) => ({
          category: row.category,
          totalQuantity: row.totalQuantity ?? row.quantity ?? 0,
          approxCost:
            row.approxCost ??
            row.totalCost ??
            row.cost ??
            null,
        })),
      );

      // загрузка мастеров
      const utilItems =
        (masterUtilizationRes as any)?.items ??
        (masterUtilizationRes as any)?.byMaster ??
        [];
      setMasterUtilization(
        utilItems.map((item: any) => ({
          masterId: item.masterId,
          masterName: item.masterName,
          appointmentsCount: item.appointmentsCount ?? item.count ?? 0,
          bookedMinutes: item.bookedMinutes ?? 0,
          availableMinutes: item.availableMinutes ?? 0,
        })),
      );

      // склад: низкий остаток
      const lowItems =
        (lowStockRes as any)?.items ?? (lowStockRes as any) ?? [];
      setLowStockItems(lowItems);

      // статусы записей
      const statsAny = appointmentStats as any;
      const rawStatus =
        statsAny?.byStatus ??
        statsAny?.statuses ??
        statsAny?.items ??
        statsAny?.data ??
        [];
      setStatusDistribution(
        rawStatus.map((row: any) => ({
          status: row.status ?? row.code,
          label: row.label ?? row.status ?? row.code,
          count: row.count ?? row.total ?? 0,
        })),
      );

      // выручка по услугам
      const srv = servicesRevenue as any;

      setServicesByService(
        (srv?.byService ?? []).map((row: any) => ({
          serviceId: row.serviceId ?? null,
          serviceName: row.serviceName ?? null,
          serviceCategory: row.serviceCategory ?? "OTHER",
          totalRevenue: row.totalRevenue ?? 0,
          appointmentsCount: row.appointmentsCount ?? 0,
        })),
      );

      setServicesByCategory(
        (srv?.byCategory ?? []).map((row: any) => ({
          category: row.category ?? "OTHER",
          totalRevenue: row.totalRevenue ?? 0,
          appointmentsCount: row.appointmentsCount ?? 0,
        })),
      );
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Ошибка загрузки отчётов");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const totalRevenue = moneyByMaster.reduce(
    (sum, m) => sum + m.revenue,
    0,
  );
  const totalWriteoffCost = inventoryWriteoffs.reduce(
    (sum, r) => sum + (r.approxCost ?? 0),
    0,
  );
  const totalAppointments = statusDistribution.reduce(
    (sum, r) => sum + r.count,
    0,
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">
              Отчёты
            </h1>
            <span className="text-sm text-gray-500">
              Деньги, загрузка мастеров, записи и склад за выбранный
              период.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/reports/masters"
              className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Отчёт по мастерам
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* фильтры периода */}
        <section className="rounded bg-white p-4 shadow">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-700">
                Выберите период для отчёта.
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

        {/* выручка по мастерам */}
        <section className="space-y-2 rounded bg-white p-4 shadow">
          <h2 className="text-sm font-semibold text-gray-800">
            Выручка по мастерам
          </h2>
          <div className="text-xs text-gray-500">
            Общая выручка:{" "}
            <span className="font-semibold">
              {formatMoney(totalRevenue)}
            </span>
          </div>

          {moneyByMaster.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    Мастер
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Записей
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Выручка
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {moneyByMaster.map((item) => (
                  <tr key={item.masterId}>
                    <td className="px-3 py-2 text-gray-900">
                      {item.masterName}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {item.count}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {formatMoney(item.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : !loading ? (
            <p className="text-xs text-gray-500">
              Нет выручки за выбранный период. Попробуйте выбрать другой
              диапазон дат.
            </p>
          ) : null}
        </section>

        {/* выручка по услугам */}
        <section className="space-y-2 rounded bg-white p-4 shadow">
          <h2 className="text-sm font-semibold text-gray-800">
            Выручка по услугам
          </h2>
          <p className="text-xs text-gray-500">
            Какие услуги приносят больше всего денег и сколько по ним
            записей.
          </p>

          {servicesByService.length > 0 ? (
            <>
              <table className="mb-4 min-w-full divide-y divide-gray-200 text-xs">
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {servicesByService.map((item, idx) => (
                    <tr key={item.serviceId ?? `svc-${idx}`}>
                      <td className="px-3 py-2 text-gray-900">
                        {item.serviceName ?? "Без названия"}
                      </td>
                      <td className="px-3 py-2 text-gray-900">
                        {item.serviceCategory}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {item.appointmentsCount}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {formatMoney(item.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {servicesByCategory.length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold text-gray-700">
                    По категориям
                  </h3>
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {servicesByCategory.map((row) => (
                        <tr key={row.category}>
                          <td className="px-3 py-2 text-gray-900">
                            {row.category}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-900">
                            {row.appointmentsCount}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-900">
                            {formatMoney(row.totalRevenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : !loading ? (
            <p className="text-xs text-gray-500">
              Нет данных по выручке по услугам за выбранный период.
            </p>
          ) : null}
        </section>

        {/* списания со склада */}
        <section className="space-y-2 rounded bg-white p-4 shadow">
          <h2 className="text-sm font-semibold text-gray-800">
            Списания со склада
          </h2>
          <div className="text-xs text-gray-500">
            Ориентировочная себестоимость за период:{" "}
            <span className="font-semibold">
              {formatMoney(totalWriteoffCost)}
            </span>
          </div>

          {inventoryWriteoffs.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    Категория
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Кол-во
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Стоимость
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inventoryWriteoffs.map((row) => (
                  <tr key={row.category}>
                    <td className="px-3 py-2 text-gray-900">
                      {row.category}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {row.totalQuantity}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {row.approxCost != null
                        ? formatMoney(row.approxCost)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : !loading ? (
            <p className="text-xs text-gray-500">
              Нет списаний со склада за выбранный период. Списания
              появятся после операций на складе.
            </p>
          ) : null}
        </section>

        {/* загрузка мастеров */}
        <section className="space-y-2 rounded bg-white p-4 shadow">
          <h2 className="text-sm font-semibold text-gray-800">
            Загрузка мастеров
          </h2>
          <p className="text-xs text-gray-500">
            Загрузка считается как занятые минуты / доступные минуты по
            рабочему графику мастера за период.
          </p>

          {masterUtilization.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    Мастер
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Записей
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Часы с клиентами
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Доступно часов
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Загрузка
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {masterUtilization.map((item) => {
                  const bookedHours = item.bookedMinutes / 60;
                  const availableHours = item.availableMinutes / 60;
                  const utilization =
                    item.availableMinutes > 0
                      ? item.bookedMinutes / item.availableMinutes
                      : 0;
                  return (
                    <tr key={item.masterId}>
                      <td className="px-3 py-2 text-gray-900">
                        {item.masterName}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {item.appointmentsCount}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {bookedHours.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {availableHours.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {formatPercent(utilization)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : !loading ? (
            <p className="text-xs text-gray-500">
              Нет данных по загрузке мастеров за выбранный период.
            </p>
          ) : null}
        </section>

        {/* позиции с низким остатком */}
        <section className="space-y-2 rounded bg-white p-4 shadow">
          <h2 className="text-sm font-semibold text-gray-800">
            Позиции с низким остатком
          </h2>

          {lowStockItems.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    Позиция
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Остаток
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    Категория
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lowStockItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-2 text-gray-900">
                      {item.category}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : !loading ? (
            <p className="text-xs text-gray-500">
              Позиции с низким остатком не найдены. Это хорошо — склад
              пока в порядке.
            </p>
          ) : null}
        </section>

        {/* статусы записей */}
        <section className="space-y-2 rounded bg-white p-4 shadow">
          <h2 className="text-sm font-semibold text-gray-800">
            Статусы записей
          </h2>

          {statusDistribution.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    Статус
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Кол-во
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Доля
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {statusDistribution.map((row) => {
                  const count = row.count;
                  const share =
                    totalAppointments > 0 ? count / totalAppointments : 0;
                  return (
                    <tr key={row.status}>
                      <td className="px-3 py-2 text-gray-900">
                        {row.label}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {count}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {totalAppointments > 0
                          ? formatPercent(share)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : !loading ? (
            <p className="text-xs text-gray-500">
              Нет данных по записям за выбранный период.
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
