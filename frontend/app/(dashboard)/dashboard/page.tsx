34      
// app/(dashboard)/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import Link from "next/link";

import type {
  Appointment,
  AppointmentStatus,
  Client,
  AppointmentStatsResponse,
  Master,
  LowStockResponse,
  AppointmentListResponse,
} from "../../lib/types";
import {
  ClientApi,
  AppointmentApi,
  MasterApi,
  InventoryApi,
} from "../../lib/api";
import { DashboardCalendar } from "../../components/DashboardCalendar";
import AppointmentStatusBadge from "../../components/appointments/AppointmentStatusBadge";
import ToastContainer, { type ToastItem } from "../../components/Toast";
import AppointmentForm from "../../components/appointments/AppointmentForm";

type DateRangePreset = "today" | "week" | "month";

// Компонент карточки низкого остатка
function LowStockCard() {
  const [data, setData] = useState<LowStockResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
     setLoading(true);
    InventoryApi.getLowStock({ limit: 5 })
      
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => {
        console.error("Low stock load error", err);
        setError("Не удалось загрузить данные склада");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-500">Низкий остаток</div>
        <div className="mt-2 h-6 w-16 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-500">Низкий остаток</div>
        <div className="mt-2 text-sm text-red-600">
          {error || "Нет данных"}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Низкий остаток</div>
          <div className="text-2xl font-semibold">{76
          count}</div>
        </div>
        <Link
          href="/inventory"
          className="text-sm text-blue-600 hover:underline"
        >
          Открыть склад
        </Link>
      </div>

      {data.items.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {data.items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span className="truncate">{item.name}</span>
              <span className="ml-2 text-gray-600">{item.quantity}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [selectedMasterId, setSelectedMasterId] = useState<number | undefined>(
    undefined,
  );

  // appointments для KPI-периода (Сегодня/Неделя/Месяц)
  const [periodAppointments, setPeriodAppointments] = useState<Appointment[]>(
    [],
  );
  // appointments для календаря (всегда месяц selectedDate)
  const [calendarAppointments, setCalendarAppointments] = useState<
    Appointment[]
  >([]);

  const [stats, setStats] = useState<AppointmentStatsResponse | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [rangePreset, setRangePreset] = useState<DateRangePreset>("today");

  const [loading, setLoading] = useState(false);
  const [toastItems, setToastItems] = useState<ToastItem[]>([]);

  // диапазон для KPI
  const kpiRange = useMemo(() => {
    const now = new Date();
    if (rangePreset === "today") {
      return {
        from: startOfDay(now),
        to: endOfDay(now),
      };
    }
    if (rangePreset === "week") {
      const day = now.getDay() || 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - day + 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        from: startOfDay(monday),
        to: endOfDay(sunday),
      };
    }
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: startOfDay(first),
      to: endOfDay(last),
    };
  }, [rangePreset]);

  // диапазон для календаря — всегда календарный месяц выбранной даты
  const calendarRange = useMemo(() => {
    const base = selectedDate;
    const first = new Date(base.getFullYear(), base.getMonth(), 1);
    const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return {
      from: startOfDay(first),
      to: endOfDay(last),
    };
  }, [selectedDate]);

  // записи на выбранный день — из календарного набора
  const selectedDateAppointments = useMemo(
    () =>
      calendarAppointments.filter((a) => {
        const d = new Date(a.startsAt);
        return (
          d.getFullYear() === selectedDate.getFullYear() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getDate() === selectedDate.getDate()
        );
      }),
    [calendarAppointments, selectedDate],
  );

  // сегодня по календарным данным
  const todayAppointments = useMemo(
    () =>
      calendarAppointments.filter((a) =>
        isSameDay(new Date(a.startsAt), new Date()),
      ),
    [calendarAppointments],
  );

  useEffect(() => {
    void loadInitial();
  }, []);

  // грузим KPI-данные при смене периода / мастера
  useEffect(() => {
    void loadKpiData();
  }, [rangePreset, selectedMasterId, kpiRange.from, kpiRange.to]);

  // грузим данные для календаря, когда меняется месяц или мастер
  useEffect(() => {
    void loadCalendarData();
  }, [calendarRange.from, calendarRange.to, selectedMasterId]);

  async function loadInitial() {
    try {
      const [clientsData, mastersData] = await Promise.all([
        ClientApi.getAll(),
        MasterApi.getAll(),
      ]);
      setClients(clientsData);
      setMasters(mastersData);
    } catch (e: any) {
      pushToast({
        type: "error",
        message: e.message ?? "Ошибка загрузки клиентов/мастеров",
      });
    }
  }

  async function loadKpiData() {
    try {
      setLoading(true);

      const paramsForAppointments: any = {
        limit: 200,
        offset: 0,
        status: "ALL",
        from: kpiRange.from.toISOString(),
        to: kpiRange.to.toISOString(),
      };
      if (selectedMasterId) {
        paramsForAppointments.masterId = selectedMasterId;
      }

      const paramsForStats: any = {
        from: kpiRange.from.toISOString(),
        to: kpiRange.to.toISOString(),
      };
      if (selectedMasterId) {
        paramsForStats.masterId = selectedMasterId;
      }

      const [appointmentsDataRaw, statsData] = await Promise.all([
        AppointmentApi.getAppointments(paramsForAppointments),
        AppointmentApi.getStats(paramsForStats),
      ]);

      const appointmentsData =
        (appointmentsDataRaw as AppointmentListResponse).data ?? {
          items: [],
          total: 0,
        };

      setPeriodAppointments(appointmentsData.items);
      setStats(statsData);
    } catch (e: any) {
      pushToast({
        type: "error",
        message: e.message ?? "Ошибка загрузки данных дашборда",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadCalendarData() {
    try {
      const params: any = {
        limit: 2000,
        offset: 0,
        status: "ALL",
        from: calendarRange.from.toISOString(),
        to: calendarRange.to.toISOString(),
      };
      if (selectedMasterId) {
        params.masterId = selectedMasterId;
      }

      const resRaw = await AppointmentApi.getAppointments(params);
      const res =
        (resRaw as AppointmentListResponse).data ?? { items: [], total: 0 };

      setCalendarAppointments(res.items);
    } catch (e: any) {
      pushToast({
        type: "error",
        message: e.message ?? "Ошибка загрузки данных календаря",
      });
    }
  }

  function pushToast(item: Omit<ToastItem, "id">) {
    setToastItems((prev) => [
      ...prev,
      { id: Date.now().toString(), ...item },
    ]);
  }

  function handleRemoveToast(id: string) {
    setToastItems((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleChangeStatus(id: number, status: AppointmentStatus) {
    try {
      const updated = await AppointmentApi.updateAppointment(id, { status });

      // обновляем и календарные, и периодные данные
      setCalendarAppointments((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );
      setPeriodAppointments((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );

      pushToast({ type: "success", message: "Статус записи обновлён" });
    } catch (e: any) {
      pushToast({
        type: "error",
        message: e.message ?? "Не удалось обновить статус",
      });
    }
  }

  async function handleDeleteAppointment(id: number) {
    if (!confirm("Удалить запись?")) return;
    try {
      await AppointmentApi.deleteAppointment(id);

      setCalendarAppointments((prev) => prev.filter((a) => a.id !== id));
      setPeriodAppointments((prev) => prev.filter((a) => a.id !== id));

      pushToast({ type: "success", message: "Запись удалена" });
    } catch (e: any) {
      pushToast({
        type: "error",
        message: e.message ?? "Не удалось удалить запись",
      });
    }
  }

  async function handleCreateAppointment(data: {
    clientId: number;
    masterId: number;
    serviceName: string;
    price: number;
    startsAt: string;
    endsAt: string;
    notes?: string;
  }) {
    try {
      const created = await AppointmentApi.createAppointment(data);

      const createdDate = new Date(created.startsAt);

      // запись попадает в календарный месяц?
      if (
        createdDate >= calendarRange.from &&
        createdDate <= calendarRange.to
      ) {
        setCalendarAppointments((prev) => [...prev, created]);
      }

      // и в выбранный KPI период?
      if (createdDate >= kpiRange.from && createdDate <= kpiRange.to) {
        setPeriodAppointments((prev) => [...prev, created]);
      }

      pushToast({ type: "success", message: "Запись создана" });
    } catch (e: any) {
      pushToast({
        type: "error",
        message: e.message ?? "Не удалось создать запись",
      });
    }
  }

  function isSameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  const totalRevenue = stats?.totalRevenue ?? 0;
  const totalCompleted = stats?.totalCompleted ?? 0;
  const totalAppointments = stats?.totalAppointments ?? 0;
  const noShowCount =
    stats?.countsByStatus?.["NO_SHOW"] ??
    stats?.countsByStatus?.["no_show"] ??
    0;

  function handleMasterFilterChange(value: string) {
    const id = value ? Number(value) : undefined;
    setSelectedMasterId(id);
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры периода/мастера */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>
          <p className="text-sm text-gray-500">
            Быстрый обзор по клиентам и записям.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">
              Период:
            </span>
            <div className="inline-flex rounded-md border bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setRangePreset("today")}
                className={`px-3 py-1 text-sm ${
                  rangePreset === "today"
                    ? "rounded-md bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Сегодня
              </button>
              <button
                type="button"
                onClick={() => setRangePreset("week")}
                className={`px-3 py-1 text-sm ${
                  rangePreset === "week"
                    ? "rounded-md bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Неделя
              </button>
              <button
                type="button"
                onClick={() => setRangePreset("month")}
                className={`px-3 py-1 text-sm ${
                  rangePreset === "month"
                    ? "rounded-md bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Месяц
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">
              Мастер:
            </span>
            <select
              value={selectedMasterId ?? ""}
              onChange={(e) => handleMasterFilterChange(e.target.value)}
              className="min-w-[160px] rounded border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Все мастера</option>
              {masters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Карточки KPI */}
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Всего клиентов</div>
          <div className="mt-2 text-2xl font-semibold">
            {clients.length}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">
            Записей в период
            {selectedMasterId && " (по мастеру)"}
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {totalAppointments}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">
            Выручка (COMPLETED, период)
            {selectedMasterId && " (по мастеру)"}
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {totalRevenue.toFixed(2)} ₽
          </div>
        </div>

        <LowStockCard />
      </section>

      {/* Дополнительные метрики */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">
            Завершено (COMPLETED, период)
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {totalCompleted}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">No‑show в период</div>
          <div className="mt-2 text-2xl font-semibold">
            {noShowCount}
          </div>
        </div>
      </section>

      {/* Основной контент: обзор + список + форма + календарь */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-lg font-medium">
              Быстрый обзор по записям
            </h2>
            <div className="grid gap-4 text-sm md:grid-cols-3">
              <div>
                <div className="text-gray-500">Сегодня</div>
                <div className="mt-1 text-xl font-semibold">
                  {todayAppointments.length}
                </div>
              </div>
              <div>
                <div className="text-gray-500">
                  Завершено (период)
                </div>
                <div className="mt-1 text-xl font-semibold">
                  {totalCompleted}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Выручка сегодня</div>
                <div className="mt-1 text-xl font-semibold">
                  {todayAppointments
                    .filter((a) => a.status === "COMPLETED")
                    .reduce((sum, a) => sum + a.price, 0)
                    .toFixed(2)}{" "}
                  ₽
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-medium">
                Записи на{" "}
                {format(selectedDate, "d MMMM yyyy", { locale: ru })}
              </h2>
              {loading && (
                <span className="text-xs text-gray-500">
                  Обновление…
                </span>
              )}
            </div>

            {selectedDateAppointments.length === 0 ? (
              <p className="text-sm text-gray-500">
                На эту дату пока нет записей.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {selectedDateAppointments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {format(new Date(a.startsAt), "HH:mm", {
                          locale: ru,
                        })}{" "}
                        — {a.serviceName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {a.client?.fullName}
                        {a.client && (
                          <span className="ml-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600">
                            {a.client.status}
                          </span>
                        )}{" "}
                        {a.client && (a.client.noShowCount ?? 0) > 0 && (
                          <span className="ml-1 inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-800">
                            no‑show: {a.client.noShowCount}
                          </span>
                        )}
                        {a.master && (
                          <span className="ml-2 text-gray-400">
                            · {a.master.fullName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AppointmentStatusBadge
                        status={a.status}
                        onChangeStatus={(status) =>
                          void handleChangeStatus(a.id, status)
                        }
                      />
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => void handleDeleteAppointment(a.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-medium">Быстрая запись</h2>
            <AppointmentForm
              clients={clients}
              masters={masters}
              onCreate={(data) => void handleCreateAppointment(data)}
            />
          </div>
        </section>

        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-medium">Календарь</h2>
<DashboardCalendar
  appointments={calendarAppointments}
  onSelectDate={setSelectedDate}
/>
        </section>
      </div>

      <ToastContainer toasts={toastItems} onClose={handleRemoveToast} />
    </div>
  );
}
76
