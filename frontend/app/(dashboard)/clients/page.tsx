"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";

import type { Client, ClientStatus } from "../../lib/types";
import { ClientApi } from "../../lib/api";
import ToastContainer, { type ToastItem } from "../../components/Toast";

const statusLabels: Record<ClientStatus, string> = {
  REGULAR: "REGULAR",
  VIP: "VIP",
  RISK: "RISK",
};

type FormState = {
  fullName: string;
  phone: string;
  email: string;
  status: ClientStatus;
  notes: string;
  birthDate: string; // YYYY-MM-DD
};

const emptyForm: FormState = {
  fullName: "",
  phone: "",
  email: "",
  status: "REGULAR",
  notes: "",
  birthDate: "",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [toastItems, setToastItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    void loadClients();
  }, []);

  function pushToast(item: Omit<ToastItem, "id">) {
    setToastItems((prev) => [
      ...prev,
      { id: Date.now().toString(), ...item },
    ]);
  }

  function handleRemoveToast(id: string) {
    setToastItems((prev) => prev.filter((t) => t.id !== id));
  }

  async function loadClients() {
    try {
      setLoading(true);
      setError(null);
      const data = await ClientApi.getAll();
      setClients(data);
    } catch (e: any) {
      setError(e.message ?? "Не удалось загрузить клиентов");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingClientId(null);
  }

  function handleEditClient(client: Client) {
    setEditingClientId(client.id);

    let birthDate = "";
    if (client.birthDate) {
      const d = new Date(client.birthDate);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      birthDate = `${yyyy}-${mm}-${dd}`;
    }

    setForm({
      fullName: client.fullName ?? "",
      phone: client.phone ?? "",
      email: client.email ?? "",
      status: client.status,
      notes: client.notes ?? "",
      birthDate,
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.phone.trim()) {
      pushToast({
        type: "error",
        message: "ФИО и телефон обязательны",
      });
      return;
    }

    try {
      setSaving(true);

      const payload: any = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
      };

      if (form.birthDate) {
        payload.birthDate = new Date(form.birthDate).toISOString();
      }

      if (editingClientId == null) {
        const created = await ClientApi.create(payload);
        setClients((prev) => [created, ...prev]);
        pushToast({
          type: "success",
          message: "Клиент создан",
        });
      } else {
        const updated = await ClientApi.update(editingClientId, payload);
        setClients((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)),
        );
        pushToast({
          type: "success",
          message: "Клиент обновлён",
        });
      }

      resetForm();
    } catch (e: any) {
      pushToast({
        type: "error",
        message:
          e.message ??
          (editingClientId == null
            ? "Не удалось создать клиента"
            : "Не удалось обновить клиента"),
      });
    } finally {
      setSaving(false);
    }
  }

  const hasClients = clients.length > 0;

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Клиенты
          </h1>
          <p className="text-sm text-gray-500">
            Создание и список клиентов студии. Клиенты также добавляются
            автоматически при создании записей.
          </p>
        </div>
        <Link
          href="/appointments"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          К записям
        </Link>
      </div>

      {/* Форма создания / редактирования клиента */}
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">
            {editingClientId == null
              ? "Добавить клиента"
              : "Редактировать клиента"}
          </h2>
          {editingClientId != null && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Сбросить форму
            </button>
          )}
        </div>

        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={handleSubmit}
        >
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">
              ФИО *
            </label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border px-2 py-1 text-sm"
              value={form.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">
              Телефон *
            </label>
            <input
              type="tel"
              className="mt-1 block w-full rounded-md border px-2 py-1 text-sm"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              className="mt-1 block w-full rounded-md border px-2 py-1 text-sm"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">
              Дата рождения
            </label>
            <input
              type="date"
              className="mt-1 block w-full rounded-md border px-2 py-1 text-sm"
              value={form.birthDate}
              onChange={(e) => handleChange("birthDate", e.target.value)}
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">
              Статус
            </label>
            <select
              className="mt-1 block w-full rounded-md border px-2 py-1 text-sm"
              value={form.status}
              onChange={(e) =>
                handleChange("status", e.target.value as ClientStatus)
              }
            >
              <option value="REGULAR">REGULAR</option>
              <option value="VIP">VIP</option>
              <option value="RISK">RISK</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Заметки
            </label>
            <textarea
              className="mt-1 block w-full rounded-md border px-2 py-1 text-sm"
              rows={3}
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Аллергии, предпочтения, кто рекомендовал и т.п."
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-3">
            {editingClientId != null && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {saving
                ? "Сохраняем..."
                : editingClientId == null
                ? "Добавить клиента"
                : "Сохранить изменения"}
            </button>
          </div>
        </form>
      </section>

      {/* Ошибки загрузки */}
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Таблица клиентов */}
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Все клиенты</h2>
          {loading && (
            <span className="text-xs text-gray-500">Загрузка…</span>
          )}
        </div>

        {!hasClients && !loading ? (
          <div className="rounded border border-dashed bg-white px-4 py-6 text-sm text-gray-500">
            Пока нет клиентов в базе. Добавьте клиента через форму выше или
            создайте запись — клиент появится автоматически.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">
                    Имя
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">
                    Email
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">
                    Телефон
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">
                    Статус
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">
                    Active
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">
                    No‑show
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">
                        {client.fullName}
                      </div>
                      {client.notes && (
                        <div className="text-xs text-gray-500">
                          {client.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {client.email ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {client.phone}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          client.status === "VIP"
                            ? "bg-green-100 text-green-800"
                            : client.status === "RISK"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabels[client.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {client.isBlocked ? (
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                          inactive
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {client.noShowCount && client.noShowCount > 0 ? (
                        <span className="inline-flex rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                          {client.noShowCount}
                        </span>
                      ) : (
                        "0"
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleEditClient(client)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        Редактировать
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ToastContainer items={toastItems} onRemove={handleRemoveToast} />
    </div>
  );
}
