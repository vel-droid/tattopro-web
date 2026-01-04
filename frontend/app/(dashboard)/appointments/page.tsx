// app/(dashboard)/appointments/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";

import type {
  Appointment,
  AppointmentListResponse,
  AppointmentStatus,
  Master,
  Client,
  Service,
} from "../../lib/types";
import {
  AppointmentApi,
  MasterApi,
  ClientApi,
  ServiceApi,
} from "../../lib/api";
import AppointmentTable from "../../components/appointments/AppointmentTable";
import AppointmentForm from "../../components/appointments/AppointmentForm";
import ToastContainer, { type ToastItem } from "../../components/Toast";

type FilterState = {
  date?: string;
  masterId?: number;
};

type BusySlot = { startsAt: string; endsAt: string };

type DayAvailability = {
  isDayOff: boolean;
  startTime: string;
  endTime: string;
};

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(1000); // дневной журнал — без пагинации
  const [offset] = useState(0);

  const [clients, setClients] = useState<Client[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [filters, setFilters] = useState<FilterState>(() => {
    const today = new Date();
    return {
      date: format(today, "yyyy-MM-dd"),
    };
  });

  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "ALL">(
    "ALL",
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [dayAvailability, setDayAvailability] =
    useState<DayAvailability | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const showSuccess = (message: string) => showToast("success", message);
  const showError = (message: string) => showToast("error", message);

  const handleToastClose = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadClientsMastersServices = async () => {
    try {
      const [clientsData, mastersData, servicesData] = await Promise.all([
        ClientApi.getAll(),
        MasterApi.getAll(),
        ServiceApi.getAll(),
      ]);
      setClients(clientsData);
      setMasters(mastersData);
      setServices(servicesData.filter((s) => s.isActive));
    } catch (e: any) {
      console.error(e);
      const msg = e.message || "Ошибка загрузки клиентов, мастеров или услуг";
      setError(msg);
      showError(msg);
    }
  };

  const buildRange = () => {
    let from: string | undefined;
    let to: string | undefined;

    if (filters.date) {
      from = `${filters.date}T00:00:00.000Z`;
      to = `${filters.date}T23:59:59.999Z`;
    }

    return { from, to };
  };

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

      if (filters.masterId) {
        params.masterId = filters.masterId;
      }

      const { from, to } = buildRange();
      if (from) params.from = from;
      if (to) params.to = to;

      const res = (await AppointmentApi.getAppointments(
        params,
      )) as AppointmentListResponse;

      const items = res.data?.items ?? [];
      const total = res.data?.total ?? 0;

      const sorted = [...items].sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );

      setAppointments(sorted);
      setTotal(total);
    } catch (e: any) {
      console.error(e);
      const msg = e.message || "Ошибка загрузки записей";
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  // загрузка занятости и доступности мастера на конкретный день
  const loadMasterDayData = async (
    masterId?: number,
    dateStr?: string | undefined,
  ) => {
    if (!masterId || !dateStr) {
      setBusySlots([]);
      setDayAvailability(null);
      return;
    }

    try {
      const fromIso = new Date(`${dateStr}T00:00:00`).toISOString();
      const toIso = new Date(`${dateStr}T23:59:59`).toISOString();

      // 1) записи мастера за день
      const apptsRes = (await AppointmentApi.getAppointments({
        masterId,
        from: fromIso,
        to: toIso,
        limit: 1000,
        offset: 0,
        status: "ALL" as any,
      })) as AppointmentListResponse;

      const apptItems = apptsRes.data?.items ?? [];

      setBusySlots(
        apptItems.map((a) => ({
          startsAt: a.startsAt,
          endsAt: a.endsAt,
        })),
      );

      // 2) day-availability
      const params = new URLSearchParams({
        from: dateStr,
        to: dateStr,
      });

      const res = await fetch(
        `${BACKEND_BASE_URL}/api/masters/${masterId}/day-availability?${params.toString()}`,
      );
      if (!res.ok) {
        console.warn("Failed to load day-availability", await res.text());
        setDayAvailability(null);
        return;
      }
      const json = (await res.json()) as {
        success: boolean;
        data: {
          days: {
            date: string;
            startTime: string;
            endTime: string;
            isDayOff: boolean;
          }[];
        };
        error?: string | null;
      };

      if (!json.success) {
        console.warn("day-availability error", json.error);
        setDayAvailability(null);
        return;
      }

      const dayData = json.data.days[0];
      if (!dayData) {
        setDayAvailability(null);
        return;
      }

      setDayAvailability({
        isDayOff: dayData.isDayOff,
        startTime: dayData.startTime,
        endTime: dayData.endTime,
      });
    } catch (e) {
      console.error("loadMasterDayData error", e);
      setBusySlots([]);
      setDayAvailability(null);
    }
  };

  useEffect(() => {
    void loadClientsMastersServices();
  }, []);

  useEffect(() => {
    void loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset, statusFilter, filters.masterId, filters.date]);

  const handleCreateClick = () => {
    setEditingAppointment(null);
    setIsFormOpen(true);
    void loadMasterDayData(filters.masterId, filters.date);
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsFormOpen(true);
    const start = new Date(appointment.startsAt);
    const dateStr = start.toISOString().slice(0, 10);
    void loadMasterDayData(appointment.masterId, dateStr);
  };

  const handleDelete = async (appointment: Appointment) => {
    if (!confirm("Удалить эту запись?")) return;
    try {
      await AppointmentApi.deleteAppointment(appointment.id);
      await loadAppointments();
      showSuccess("Запись удалена");
    } catch (e: any) {
      console.error(e);
      showError(e.message || "Ошибка удаления записи");
    }
  };

  const handleChangeStatus = async (
    appointment: Appointment,
    nextStatus: AppointmentStatus,
  ) => {
    try {
      await AppointmentApi.updateAppointment(appointment.id, {
        status: nextStatus,
      });
      await loadAppointments();
      showSuccess(
        nextStatus === "NO_SHOW"
          ? 'Статус изменён на "Не пришёл"'
          : "Статус обновлён",
      );
    } catch (e: any) {
      console.error(e);
      showError(e.message || "Ошибка смены статуса");
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingAppointment(null);
    setBusySlots([]);
    setDayAvailability(null);
  };

  const handleFormSubmit = async (data: {
    clientId: number;
    masterId: number;
    serviceId: number | null;
    serviceName: string;
    price: number;
    startsAt: string;
    endsAt: string;
    status?: AppointmentStatus;
    notes?: string;
  }) => {
    try {
      if (editingAppointment) {
        await AppointmentApi.updateAppointment(editingAppointment.id, data);
        showSuccess("Запись обновлена");
      } else {
        await AppointmentApi.createAppointment(data);
        showSuccess("Запись создана");
      }
      handleFormClose();
      await loadAppointments();
    } catch (e: any) {
      console.error(e);
      showError(e.message || "Ошибка сохранения записи");
    }
  };

  const handleDateFilterChange = (value: string) => {
    setFilters((prev) => {
      const next = { ...prev, date: value || undefined };
      void loadMasterDayData(next.masterId, next.date);
      return next;
    });
  };

  const handleMasterFilterChange = (value: string) => {
    const id = value ? Number(value) : undefined;
    setFilters((prev) => {
      const next = { ...prev, masterId: id };
      void loadMasterDayData(next.masterId, next.date);
      return next;
    });
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as AppointmentStatus | "ALL");
  };

  const handleExportCsv = async () => {
    try {
      const params: any = {
        limit: 10000,
        offset: 0,
      };

      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }

      if (filters.masterId) {
        params.masterId = filters.masterId;
      }

      const { from, to } = buildRange();
      if (from) params.from = from;
      if (to) params.to = to;

      const res = (await AppointmentApi.getAppointments(
        params,
      )) as AppointmentListResponse;

      const items = res.data?.items ?? [];

      if (!items.length) {
        showError("Нет записей для экспорта");
        return;
      }

      const header = [
        "Дата",
        "Время",
        "Клиент",
        "Телефон",
        "Мастер",
        "Услуга",
        "Цена",
        "Статус",
        "Заметки",
      ];

      const rows = items.map((a) => {
        const date = format(new Date(a.startsAt), "yyyy-MM-dd");
        const time = format(new Date(a.startsAt), "HH:mm");
        const clientName = a.client?.fullName ?? "";
        const clientPhone = a.client?.phone ?? "";
        const masterName = a.master?.fullName ?? "";
        const statusLabel =
          a.status === "PENDING"
            ? "В ожидании"
            : a.status === "APPROVED"
            ? "Подтверждён"
            : a.status === "COMPLETED"
            ? "Завершён"
            : a.status === "CANCELLED"
            ? "Отменён"
            : "Не пришёл";

        return [
          date,
          time,
          clientName,
          clientPhone,
          masterName,
          a.serviceName,
          String(a.price),
          statusLabel,
          a.notes ?? "",
        ];
      });

      const csvLines = [
        header.join(";"),
        ...rows.map((r) =>
          r
            .map((cell) => {
              const safe = cell.replace(/"/g, '""');
              if (
                safe.includes(";") ||
                safe.includes('"') ||
                safe.includes("\n")
              ) {
                return `"${safe}"`;
              }
              return safe;
            })
            .join(";"),
        ),
      ];

      const csvContent = csvLines.join("\n");
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const now = new Date();
      const filename = `appointments_${format(now, "yyyy-MM-dd")}.csv`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess("CSV файл сформирован и скачан");
    } catch (e: any) {
      console.error(e);
      showError(e.message || "Ошибка экспорта CSV");
    }
  };

  const hasData = appointments.length > 0;
  const filtersApplied = statusFilter !== "ALL" || !!filters.masterId;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">Записи</h1>
            <Link
              href="/dashboard"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ← Назад к дашборду
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/appointments/table"
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Таблица записей
            </Link>
            <button
              onClick={handleExportCsv}
              className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Экспорт CSV
            </button>
            <button
              onClick={handleCreateClick}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Создать запись
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        {/* Фильтры */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Дата</label>
            <input
              type="date"
              value={filters.date || ""}
              onChange={(e) => handleDateFilterChange(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Мастер</label>
            <select
              value={filters.masterId ?? ""}
              onChange={(e) => handleMasterFilterChange(e.target.value)}
              className="min-w-[160px] rounded border px-3 py-2 text-sm"
            >
              <option value="">Все мастера</option>
              {masters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Статус</label>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="min-w-[140px] rounded border px-3 py-2 text-sm"
            >
              <option value="ALL">Все</option>
              <option value="PENDING">В ожидании</option>
              <option value="APPROVED">Подтверждён</option>
              <option value="COMPLETED">Завершён</option>
              <option value="CANCELLED">Отменён</option>
              <option value="NO_SHOW">Не пришёл</option>
            </select>
          </div>

          <div className="ml-auto text-sm text-gray-600">
            {loading
              ? "Загрузка..."
              : `Показано ${appointments.length} из ${total}`}
          </div>
        </div>

        {!loading && !error && masters.length === 0 && (
          <p className="text-xs text-gray-500">
            Мастера пока не добавлены. Перейдите в раздел «Мастера», чтобы
            создать первого мастера и начать вести записи.
          </p>
        )}

        {!loading && !error && clients.length === 0 && (
          <p className="text-xs text-gray-500">
            Клиенты будут появляться здесь по мере создания записей или импорта
            базы.
          </p>
        )}

        {error && (
          <div className="rounded bg-red-100 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Дневной журнал */}
        <div className="space-y-2">
          <div className="flex items-center justify_between">
            <h2 className="text-sm font-semibold text-gray-700">
              Журнал за{" "}
              {filters.date
                ? format(new Date(filters.date), "dd.MM.yyyy")
                : "выбранный день"}
            </h2>
          </div>

          {hasData ? (
            <AppointmentTable
              appointments={appointments}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onChangeStatus={handleChangeStatus}
            />
          ) : !loading && !error ? (
            <div className="rounded border border-dashed bg-white px-4 py-6 text-sm text-gray-500">
              {filtersApplied ? (
                <>
                  Для выбранных фильтров нет записей. Попробуйте снять часть
                  фильтров по мастеру или статусу, либо выберите другую дату.
                </>
              ) : (
                <>
                  Пока нет записей за выбранный день. Создайте первую запись
                  через кнопку «Создать запись» сверху.
                </>
              )}
            </div>
          ) : null}
        </div>

        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {editingAppointment ? "Редактирование записи" : "Новая запись"}
                </h2>
                <button
                  type="button"
                  onClick={handleFormClose}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Закрыть
                </button>
              </div>

              <AppointmentForm
                appointment={editingAppointment ?? undefined}
                clients={clients}
                masters={masters}
                services={services}
                onCreate={handleFormSubmit}
                busySlots={busySlots}
                dayAvailability={dayAvailability}
              />
            </div>
          </div>
        )}
      </main>

      <ToastContainer toasts={toasts} onClose={handleToastClose} />
    </div>
  );
}
