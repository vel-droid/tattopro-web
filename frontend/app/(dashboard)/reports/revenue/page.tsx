"use client";

import { useState } from "react";
import { ReportsApi, AppointmentApi } from "../../../lib/api";
import type { RevenueReportResponse, Appointment } from "../../../lib/types";

function formatMoney(value: number) {
  return value.toLocaleString("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
  });
}

function formatDateTime(value: string) {
  const d = new Date(value);
  const date = d.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 5);
  return `${date} ${time}`;
}

export default function RevenueReportPage() {
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [report, setReport] = useState<RevenueReportResponse | null>(null);
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>([]);

  async function handleLoad() {
    if (!from || !to) {
      setError("Укажи обе даты");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const [rev, appointmentsRes] = await Promise.all([
        ReportsApi.getRevenueReport({ from, to }),
        AppointmentApi.getAppointments({
          from,
          to,
          status: "COMPLETED",
          limit: 500,
          offset: 0,
        }),
      ]);

      setReport(rev);
      setCompletedAppointments(appointmentsRes.items);
    } catch (e: any) {
      const msg = e?.message ?? "Не удалось загрузить отчёт по выручке";
      if (msg.includes("range") || msg.includes("диапазон")) {
        setError("Проверь даты: начало периода не может быть позже конца.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const totalRevenue = report?.totalRevenue ?? 0;
  const totalCompleted = completedAppointments.length;
  const hasAnyData =
    (report && report.items.length > 0) || totalCompleted > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Отчёт по выручке
        </h1>
        <p className="text-sm text-gray-500">
          Выручка за период по мастерам и список завершённых записей.
        </p>
      </div>

      {/* Период */}
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Период</h2>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              С даты
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              По дату
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div className="md:ml-auto">
            <button
              type="button"
              onClick={handleLoad}
              disabled={loading}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {loading ? "Загружаем…" : "Показать"}
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      {/* Нет данных за период */}
      {report && !hasAnyData && !error && (
        <section className="rounded-lg border border-dashed bg-gray-50 p-4 text-sm text-gray-600">
          За выбранный период завершённых записей и выручки не найдено.
          Попробуй выбрать другой диапазон дат.
        </section>
      )}

      {/* Агрегат: выручка по мастерам */}
      {report && (
        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">Выручка по мастерам</h2>
            <div className="text-sm text-gray-500">
              Общая выручка:{" "}
              <span className="font-semibold">
                {formatMoney(totalRevenue)}
              </span>
            </div>
          </div>

          {report.items.length === 0 ? (
            <p className="text-sm text-gray-500">
              Нет выручки за выбранный период.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">
                      Мастер
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">
                      Кол-во записей
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">
                      Выручка
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {report.items.map((item) => (
                    <tr key={item.masterId}>
                      <td className="px-4 py-2">{item.masterName}</td>
                      <td className="px-4 py-2 text-right">{item.count}</td>
                      <td className="px-4 py-2 text-right">
                        {formatMoney(item.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Детализация: завершённые записи за период */}
      {report && (
        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">
              Завершённые записи за период
            </h2>
            <div className="text-sm text-gray-500">
              Всего:{" "}
              <span className="font-semibold">
                {totalCompleted}
              </span>
            </div>
          </div>

          {completedAppointments.length === 0 ? (
            <p className="text-sm text-gray-500">
              Завершённых записей за выбранный период не найдено.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">
                      Дата / время
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">
                      Мастер
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">
                      Клиент
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">
                      Услуга
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">
                      Цена
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">
                      Статус
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {completedAppointments.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-2 text-gray-700">
                        {formatDateTime(a.startsAt)}
                      </td>
                      <td className="px-4 py-2 text-gray-800">
                        {a.master?.fullName ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-800">
                        {a.client?.fullName ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-800">
                        {a.serviceName}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {formatMoney(a.price)}
                      </td>
                      <td className="px-4 py-2 text-gray-700">
                        {a.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
