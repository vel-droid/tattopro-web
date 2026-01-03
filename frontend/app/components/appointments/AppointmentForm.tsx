"use client";

import React, { useEffect, useState } from "react";

import type {
  Client,
  Master,
  Service,
  AppointmentStatus,
} from "../../lib/types";
import { ClientApi } from "../../lib/api";

type BusySlot = { startsAt: string; endsAt: string };

type DayAvailability = {
  isDayOff: boolean;
  startTime: string;
  endTime: string;
};

type Props = {
  clients: Client[];
  masters?: Master[];
  services?: Service[];
  onCreate: (data: {
    clientId: number;
    masterId: number;
    serviceId: number | null;
    serviceName: string;
    price: number;
    startsAt: string;
    endsAt: string;
    notes?: string;
    status?: AppointmentStatus;
  }) => void;
  appointment?: {
    id: number;
    clientId: number;
    masterId: number;
    serviceId: number | null;
    serviceName: string;
    price: number;
    startsAt: string;
    endsAt: string;
    notes?: string | null;
    status?: AppointmentStatus;
  };
  busySlots?: BusySlot[];
  dayAvailability?: DayAvailability | null;
};

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

export default function AppointmentForm({
  clients,
  masters = [],
  services = [],
  onCreate,
  appointment,
  busySlots = [],
  dayAvailability = null,
}: Props) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [masterId, setMasterId] = useState<string | number>("");
  const [clientId, setClientId] = useState<string | number>("");
  const [serviceId, setServiceId] = useState<string | number>("");
  const [serviceName, setServiceName] = useState("");
  const [price, setPrice] = useState<string | number>("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<AppointmentStatus | undefined>(
    appointment?.status
  );

  const [errors, setErrors] = useState<{
    date?: string;
    time?: string;
    duration?: string;
    masterId?: string;
    clientId?: string;
    serviceName?: string;
    price?: string;
  }>({});

  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientBirthDate, setNewClientBirthDate] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  const [showNewServiceForm, setShowNewServiceForm] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [creatingService, setCreatingService] = useState(false);

  useEffect(() => {
    if (!appointment) return;
    const start = new Date(appointment.startsAt);
    const end = new Date(appointment.endsAt);
    const diffMinutes = Math.max(
      15,
      Math.round((end.getTime() - start.getTime()) / (60 * 1000))
    );

    setClientId(appointment.clientId);
    setMasterId(appointment.masterId);
    setServiceId(appointment.serviceId != null ? appointment.serviceId : "");
    setServiceName(appointment.serviceName);
    setPrice(appointment.price);
    setDate(start.toISOString().slice(0, 10));
    setTime(start.toISOString().slice(11, 16));
    setDurationMinutes(diffMinutes);
    setNotes(appointment.notes ?? "");
    setStatus(appointment.status);
  }, [appointment]);

  const validate = () => {
    const nextErrors: typeof errors = {};

    if (!date) nextErrors.date = "Укажи дату";
    if (!time) nextErrors.time = "Укажи время начала";
    if (!masterId) nextErrors.masterId = "Выбери мастера";
    if (!clientId) nextErrors.clientId = "Выбери клиента";
    if (!serviceName.trim()) nextErrors.serviceName = "Укажи услугу";

    if (price === "" || Number(price) <= 0) {
      nextErrors.price = "Укажи цену больше 0";
    }

    if (!durationMinutes || durationMinutes <= 0) {
      nextErrors.duration = "Длительность должна быть больше 0";
    }

    if (date && time && durationMinutes > 0) {
      const startsAt = new Date(`${date}T${time}:00`);
      const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

      if (endsAt <= startsAt) {
        nextErrors.time = "Время окончания раньше или равно началу";
      }

      // день off
      if (dayAvailability?.isDayOff) {
        nextErrors.time = "У мастера в этот день выходной";
      } else if (
        dayAvailability &&
        dayAvailability.startTime &&
        dayAvailability.endTime
      ) {
        const [sh, sm] = dayAvailability.startTime.split(":").map(Number);
        const [eh, em] = dayAvailability.endTime.split(":").map(Number);

        const dayStart = new Date(startsAt);
        dayStart.setHours(sh || 0, sm || 0, 0, 0);
        const dayEnd = new Date(startsAt);
        dayEnd.setHours(eh || 0, em || 0, 0, 0);

        if (startsAt < dayStart || endsAt > dayEnd) {
          nextErrors.time = "Запись выходит за рабочее время мастера";
        }
      }

      // пересечение с busySlots
      for (const slot of busySlots) {
        const s = new Date(slot.startsAt);
        const e = new Date(slot.endsAt);
        if (endsAt > s && startsAt < e) {
          nextErrors.time = "В это время уже есть запись у мастера";
          break;
        }
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreateNewClient = async () => {
    if (!newClientName.trim() || !newClientPhone.trim()) {
      alert("Заполни имя и телефон");
      return;
    }

    try {
      setCreatingClient(true);
      const payload: any = {
        fullName: newClientName.trim(),
        phone: newClientPhone.trim(),
      };
      if (newClientBirthDate) {
        payload.birthDate = new Date(newClientBirthDate).toISOString();
      }

      const created = await ClientApi.create(payload);
      setClientId(created.id);
      setNewClientName("");
      setNewClientPhone("");
      setNewClientBirthDate("");
      setShowNewClientForm(false);
    } catch (err: any) {
      alert(`Ошибка: ${err.message}`);
    } finally {
      setCreatingClient(false);
    }
  };

  const handleCreateNewService = async () => {
    if (!newServiceName.trim()) {
      alert("Укажи название услуги");
      return;
    }

    try {
      setCreatingService(true);
      const payload: any = {
        name: newServiceName.trim(),
        category: "OTHER",
        basePrice: newServicePrice ? Number(newServicePrice) : null,
        defaultDurationMinutes: null,
        isActive: true,
        notes: null,
      };

      const res = await fetch(`${BACKEND_BASE_URL}/api/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error ?? "Failed to create service");
      }
      const created = json.data as Service;

      setServiceId(created.id);
      setServiceName(created.name);
      if (price === "" && created.basePrice != null) {
        setPrice(created.basePrice);
      }

      setNewServiceName("");
      setNewServicePrice("");
      setShowNewServiceForm(false);
    } catch (err: any) {
      alert(`Ошибка: ${err.message}`);
    } finally {
      setCreatingService(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const startsAt = new Date(`${date}T${time}:00`);
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

    onCreate({
      clientId: Number(clientId),
      masterId: Number(masterId),
      serviceId: serviceId === "" ? null : Number(serviceId),
      serviceName: serviceName.trim(),
      price: Number(price),
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      notes: notes || undefined,
      status,
    });

    if (!appointment) {
      setClientId("");
      setMasterId("");
      setServiceId("");
      setServiceName("");
      setPrice("");
      setDate("");
      setTime("");
      setDurationMinutes(60);
      setNotes("");
      setErrors({});
    }
  };

  const inputBase =
    "w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";
  const errorText = "mt-1 text-xs text-red-600";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      {/* Дата */}
      <div>
        <label className="mb-1 block text-xs text-gray-500">Дата</label>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
          }}
          className={`${inputBase} ${
            errors.date ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.date && <p className={errorText}>{errors.date}</p>}
      </div>

      {/* Время начала */}
      <div>
        <label className="mb-1 block text-xs text-gray-500">
          Время начала
        </label>
        <input
          type="time"
          value={time}
          onChange={(e) => {
            setTime(e.target.value);
            if (errors.time) setErrors((prev) => ({ ...prev, time: undefined }));
          }}
          className={`${inputBase} ${
            errors.time ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.time && <p className={errorText}>{errors.time}</p>}
      </div>

      {/* Длительность */}
      <div>
        <label className="mb-1 block text-xs text-gray-500">
          Длительность
        </label>
        <select
          value={durationMinutes}
          onChange={(e) => {
            setDurationMinutes(Number(e.target.value));
            if (errors.duration)
              setErrors((prev) => ({ ...prev, duration: undefined }));
          }}
          className={`${inputBase} ${
            errors.duration ? "border-red-500" : "border-gray-300"
          }`}
        >
          <option value={30}>30 минут</option>
          <option value={60}>1 час</option>
          <option value={90}>1,5 часа</option>
          <option value={120}>2 часа</option>
          <option value={150}>2,5 часа</option>
          <option value={180}>3 часа</option>
          <option value={240}>4 часа</option>
          <option value={360}>6 часов</option>
          <option value={480}>8 часов</option>
          <option value={600}>10 часов</option>
          <option value={720}>12 часов</option>
        </select>
        {errors.duration && <p className={errorText}>{errors.duration}</p>}
      </div>

      {/* Мастер */}
      <div>
        <label className="mb-1 block text-xs text-gray-500">Мастер</label>
        <select
          value={masterId}
          onChange={(e) => {
            setMasterId(e.target.value ? Number(e.target.value) : "");
            if (errors.masterId)
              setErrors((prev) => ({ ...prev, masterId: undefined }));
          }}
          className={`${inputBase} ${
            errors.masterId ? "border-red-500" : "border-gray-300"
          }`}
        >
          <option value="">Выбери мастера</option>
          {masters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName}
            </option>
          ))}
        </select>
        {errors.masterId && <p className={errorText}>{errors.masterId}</p>}
      </div>

      {/* Клиент + новый клиент */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs text-gray-500">Клиент</label>
          <button
            type="button"
            onClick={() => setShowNewClientForm((v) => !v)}
            className="text-xs text-blue-600 hover:underline"
          >
            {showNewClientForm ? "Отмена" : "+ Новый клиент"}
          </button>
        </div>

        {showNewClientForm ? (
          <div className="space-y-2 rounded border border-dashed border-gray-300 p-2">
            <input
              type="text"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              className={inputBase}
              placeholder="Имя клиента"
            />
            <input
              type="tel"
              value={newClientPhone}
              onChange={(e) => setNewClientPhone(e.target.value)}
              className={inputBase}
              placeholder="Телефон"
            />
            <input
              type="date"
              value={newClientBirthDate}
              onChange={(e) => setNewClientBirthDate(e.target.value)}
              className={inputBase}
            />
            <button
              type="button"
              disabled={creatingClient}
              onClick={handleCreateNewClient}
              className="rounded bg-gray-900 px-3 py-1 text-xs text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {creatingClient ? "Создание..." : "Создать клиента"}
            </button>
          </div>
        ) : (
          <>
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value ? Number(e.target.value) : "");
                if (errors.clientId)
                  setErrors((prev) => ({ ...prev, clientId: undefined }));
              }}
              className={`${inputBase} ${
                errors.clientId ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Выбери клиента</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
            {errors.clientId && <p className={errorText}>{errors.clientId}</p>}
          </>
        )}
      </div>

      {/* Услуга + новая услуга */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs text-gray-500">Услуга</label>
          <button
            type="button"
            onClick={() => setShowNewServiceForm((v) => !v)}
            className="text-xs text-blue-600 hover:underline"
          >
            {showNewServiceForm ? "Отмена" : "+ Новая услуга"}
          </button>
        </div>

        {showNewServiceForm && (
          <div className="mb-2 space-y-2 rounded border border-dashed border-gray-300 p-2">
            <input
              type="text"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              className={inputBase}
              placeholder="Название услуги"
            />
            <input
              type="number"
              min={0}
              step={100}
              value={newServicePrice}
              onChange={(e) => setNewServicePrice(e.target.value)}
              className={inputBase}
              placeholder="Базовая цена, ₽ (опционально)"
            />
            <button
              type="button"
              disabled={creatingService}
              onClick={handleCreateNewService}
              className="rounded bg-gray-900 px-3 py-1 text-xs text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {creatingService ? "Создание..." : "Создать услугу"}
            </button>
          </div>
        )}

        {services.length > 0 && (
          <select
            value={serviceId}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : "";
              setServiceId(id);
              const s = services.find((srv) => srv.id === id);
              if (s) {
                if (!serviceName) setServiceName(s.name);
                if (price === "" && s.basePrice != null) {
                  setPrice(s.basePrice);
                }
                if (
                  durationMinutes === 60 &&
                  s.defaultDurationMinutes != null
                ) {
                  setDurationMinutes(s.defaultDurationMinutes);
                }
              }
            }}
            className={`${inputBase} mb-2 border-gray-300`}
          >
            <option value="">Без привязки к услуге</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        <input
          type="text"
          value={serviceName}
          onChange={(e) => {
            setServiceName(e.target.value);
            if (errors.serviceName)
              setErrors((prev) => ({ ...prev, serviceName: undefined }));
          }}
          className={`${inputBase} ${
            errors.serviceName ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Тату, консультация..."
        />
        {errors.serviceName && (
          <p className={errorText}>{errors.serviceName}</p>
        )}
      </div>

      {/* Цена */}
      <div>
        <label className="mb-1 block text-xs text-gray-500">Цена</label>
        <input
          type="number"
          min={0}
          step={100}
          value={price}
          onChange={(e) => {
            setPrice(e.target.value ? Number(e.target.value) : "");
            if (errors.price)
              setErrors((prev) => ({ ...prev, price: undefined }));
          }}
          className={`${inputBase} ${
            errors.price ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.price && <p className={errorText}>{errors.price}</p>}
      </div>

      {/* Заметки */}
      <div>
        <label className="mb-1 block text-xs text-gray-500">Заметки</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${inputBase} border-gray-300`}
        />
      </div>

      {/* Статус при редактировании */}
      {appointment && (
        <div>
          <label className="mb-1 block text-xs text-gray-500">Статус</label>
          <select
            value={status ?? ""}
            onChange={(e) =>
              setStatus(
                e.target.value
                  ? (e.target.value as AppointmentStatus)
                  : undefined
              )
            }
            className={`${inputBase} border-gray-300`}
          >
            <option value="">Без изменений</option>
            <option value="PENDING">В ожидании</option>
            <option value="APPROVED">Подтверждён</option>
            <option value="COMPLETED">Завершён</option>
            <option value="CANCELLED">Отменён</option>
            <option value="NO_SHOW">Не пришёл</option>
          </select>
        </div>
      )}

      <div>
        <button
          type="submit"
          className="w-full rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          {appointment ? "Сохранить" : "Создать запись"}
        </button>
      </div>
    </form>
  );
}
