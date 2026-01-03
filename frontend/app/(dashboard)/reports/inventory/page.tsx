"use client";

import { useEffect, useState } from "react";
import { InventoryApi } from "../../../lib/api";
import type {
  InventoryCategory,
  InventoryOutReportResponse,
  InventoryMovement,
} from "../../../lib/types";

const inventoryCategoryLabels: Record<InventoryCategory, string> = {
  CONSUMABLE: "Расходники",
  JEWELRY: "Украшения",
  AFTERCARE: "Уход",
  EQUIPMENT: "Оборудование",
  OTHER: "Другое",
};

function formatMoney(value: number) {
  return value.toLocaleString("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  });
}

function formatDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InventoryReportPage() {
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

  const [report, setReport] = useState<InventoryOutReportResponse | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);

  const loadData = async () => {
    if (!from || !to) {
      setError("Укажи обе даты.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const [outReport, movementPage] = await Promise.all([
        InventoryApi.getOutReport({ from, to }),
        InventoryApi.getMovements({ from, to, limit: 200, offset: 0 }),
      ]);

      setReport(outReport);
      // берём только OUT-движения для детализации
      setMovements(
        movementPage.items.filter((m) => (m as any).type === "OUT"),
      );
    } catch (e: any) {
      console.error(e);
      const msg =
        e?.message ?? "Не удалось загрузить отчёт по складу за период.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = report?.items ?? [];
  const totalApproxCost =
    items.reduce((sum, row) => sum + (row.approxCost ?? 0), 0) ?? 0;

  const hasAnyData = items.length > 0 || movements.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Отчёт по складу
          </h1>
          <p className="text-sm text-gray-500">
            Списания расходников по категориям и список движений OUT за выбранный период.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              С даты
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              По дату
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border px-2 py-1 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? "Загружаем…" : "Показать"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded bg-red-100 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {!hasAnyData && !loading && !error && (
        <div className="rounded border border-dashed bg-white px-4 py-6 text-sm text-gray-500">
          Списаний по складу за выбранный период не было. 🙂
        </div>
      )}

      {/* Сводка по категориям */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Списания по категориям</h2>
        {items.length === 0 ? (
          <div className="rounded border border-dashed bg-white px-4 py-4 text-sm text-gray-500">
            Списаний по складу за выбранный период не было. :(
          </div>
        ) : (
          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                  <th className="px-4 py-2">Категория</th>
                  <th className="px-4 py-2">Всего списано, ед.</th>
                  <th className="px-4 py-2">Примерная стоимость</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((row, index) => (
                  <tr key={`${row.category}-${index}`}>
                    <td className="px-4 py-2 text-gray-700">
                      {inventoryCategoryLabels[
                        row.category as keyof typeof inventoryCategoryLabels
                      ] ?? row.category}
                    </td>
                    <td className="px-4 py-2">{row.totalQuantity}</td>
                    <td className="px-4 py-2">
                      {row.approxCost == null
                        ? "—"
                        : formatMoney(row.approxCost)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t bg-gray-50">
                  <td className="px-4 py-2 text-sm font-semibold">
                    Итого
                  </td>
                  <td className="px-4 py-2" />
                  <td className="px-4 py-2 text-sm font-semibold">
                    {formatMoney(totalApproxCost)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Детализация движений OUT */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Детализация списаний</h2>
        <p className="text-xs text-gray-500">
          Детализация списаний: дата, позиция, количество и причина.
        </p>

        {movements.length === 0 ? (
          <div className="rounded border border-dashed bg-white px-4 py-4 text-sm text-gray-500">
            Движений расхода за выбранный период не найдено. :(
          </div>
        ) : (
          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                  <th className="px-4 py-2">Дата</th>
                  <th className="px-4 py-2">Позиция</th>
                  <th className="px-4 py-2">Кол-во</th>
                  <th className="px-4 py-2">Причина</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2">
                      {formatDate(
                        // подстраиваемся под возможные поля даты
                        (m as any).date ??
                          (m as any).createdAt ??
                          (m as any).movedAt ??
                          "",
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {(m as any).itemName ??
                        (m as any).item?.name ??
                        "—"}
                    </td>
                    <td className="px-4 py-2">{m.quantity}</td>
                    <td className="px-4 py-2">{m.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
