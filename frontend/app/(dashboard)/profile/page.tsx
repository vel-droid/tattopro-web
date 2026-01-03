"use client";

import { useEffect, useState, FormEvent } from "react";

import type { Profile, UserRole } from "../../lib/types";
import { loadProfile, saveProfile } from "../../lib/storage";
import ToastContainer, { type ToastItem } from "../../components/Toast";

const defaultProfile: Profile = {
  name: "",
  studioName: "",
  bio: "",
  phone: "",
  email: "",
  vk: "",
  telegram: "",
  instagram: "",
  currency: "RUB",
  locale: "ru-RU",
  timeZone:
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Moscow",
  role: "admin",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [saving, setSaving] = useState(false);
  const [toastItems, setToastItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    setProfile(loadProfile(defaultProfile));
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

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  }

  function handleRoleChange(value: string) {
    setProfile((prev) => ({ ...prev, role: value as UserRole }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      saveProfile(profile);
      pushToast({
        type: "success",
        message: "Профиль сохранён",
      });
    } catch (err: any) {
      pushToast({
        type: "error",
        message: err?.message || "Не удалось сохранить профиль",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Профиль
          </h1>
          <p className="text-sm text-gray-500">
            Личные данные мастера и настройки аккаунта.
          </p>
        </div>
      </div>

      {/* Форма профиля */}
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Основная информация */}
          <div>
            <h2 className="text-lg font-medium">Основная информация</h2>
            <p className="text-xs text-gray-500">
              Эти данные используются в интерфейсе и для коммуникаций с
              клиентами.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Имя мастера
              </label>
              <input
                type="text"
                name="name"
                value={profile.name}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Как подписывать вас в системе"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Название студии / бренда
              </label>
              <input
                type="text"
                name="studioName"
                value={profile.studioName}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Название вашего проекта"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Короткое описание
            </label>
            <textarea
              name="bio"
              value={profile.bio}
              onChange={handleChange}
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Стиль, безопасность, мед. образование и т.п."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Телефон
              </label>
              <input
                type="text"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="+7 ..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="email@example.com"
              />
            </div>
          </div>

          {/* Соцсети */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">
              Социальные сети и мессенджеры
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  VK
                </label>
                <input
                  type="text"
                  name="vk"
                  value={profile.vk}
                  onChange={handleChange}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="https://vk.com/..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Telegram
                </label>
                <input
                  type="text"
                  name="telegram"
                  value={profile.telegram}
                  onChange={handleChange}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="@username или ссылка"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Instagram
                </label>
                <input
                  type="text"
                  name="instagram"
                  value={profile.instagram}
                  onChange={handleChange}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="@nickname или ссылка"
                />
              </div>
            </div>
          </div>

          {/* Настройки */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">
              Настройки аккаунта
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Валюта
                </label>
                <select
                  name="currency"
                  value={profile.currency}
                  onChange={handleChange}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="RUB">RUB (₽)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Язык интерфейса
                </label>
                <select
                  name="locale"
                  value={profile.locale}
                  onChange={handleChange}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ru-RU">Русский</option>
                  <option value="en-US">English</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Часовой пояс
                </label>
                <input
                  type="text"
                  name="timeZone"
                  value={profile.timeZone}
                  onChange={handleChange}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Напр. Europe/Moscow"
                />
              </div>
            </div>
          </div>

          {/* Роль */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">
              Роль в системе
            </h3>
            <p className="mb-2 text-xs text-gray-500">
              Пока используется только для настройки интерфейса; позже можно
              будет привязать права доступа.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleRoleChange("admin")}
                className={`rounded border px-3 py-1.5 text-xs font-medium ${
                  profile.role === "admin"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Администратор
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange("master")}
                className={`rounded border px-3 py-1.5 text-xs font-medium ${
                  profile.role === "master"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Мастер
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Сохранение..." : "Сохранить профиль"}
            </button>
          </div>
        </form>
      </section>

      <ToastContainer items={toastItems} onRemove={handleRemoveToast} />
    </div>
  );
}
