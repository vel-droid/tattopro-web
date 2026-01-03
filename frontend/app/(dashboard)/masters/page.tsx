"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Master } from "../../lib/types";
import { MasterApi } from "../../lib/api";

type DayAvailability = {
  date: string; // ISO без времени
  startTime: string;
  endTime: string;
  isDayOff: boolean;
};

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const WEEKDAY_LABELS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function formatDateISO(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function MastersPage() {
  const [masters, setMasters] = useState<Master[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMaster, setEditingMaster] = useState<Master | null>(null);

  // форма мастера
  const [form, setForm] = useState<{
    fullName: string;
    specialization: string;
    phone: string;
    isActive: "active" | "inactive";
    bio: string;
  }>({
    fullName: "",
    specialization: "",
    phone: "",
    isActive: "active",
    bio: "",
  });

  // выбранный мастер
  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);

  // месяц для расписания
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // доступность по дням
  const [dayAvailability, setDayAvailability] = useState<
    Record<string, DayAvailability>
  >({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await MasterApi.getAll();
      setMasters(data);
      if (data.length > 0) {
        setSelectedMasterId(data[0].id);
      }
    })();
  }, []);

  // сетка календаря
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days: Date[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [currentMonth]);

  const monthLabel = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    return `${MONTH_NAMES[m]} ${y}`;
  }, [currentMonth]);

  const monthRange = useMemo(() => {
    const from = startOfMonth(currentMonth);
    const to = endOfMonth(currentMonth);
    return { from, to };
  }, [currentMonth]);

  // загрузка доступности при смене мастера или месяца
  useEffect(() => {
    if (!selectedMasterId) return;

    const loadAvailability = async () => {
      setIsLoadingAvailability(true);
      try {
        const fromStr = monthRange.from.toISOString().slice(0, 10);
        const toStr = monthRange.to.toISOString().slice(0, 10);

        const res = await fetch(
          `${
            process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"
          }/api/masters/${selectedMasterId}/day-availability?from=${fromStr}&to=${toStr}`,
        );
        const json = await res.json();
        if (!json.success) {
          console.error("Failed to load day availability", json.error);
          setDayAvailability({});
          setSelectedDate(null);
          return;
        }

        const map: Record<string, DayAvailability> = {};
        const daysFromApi = (json.data?.days ?? []) as {
          date: string;
          startTime: string;
          endTime: string;
          isDayOff: boolean;
        }[];

        for (const d of daysFromApi) {
          const iso = formatDateISO(new Date(d.date));
          map[iso] = {
            date: iso,
            startTime: d.startTime || "",
            endTime: d.endTime || "",
            isDayOff: !!d.isDayOff,
          };
        }

        setDayAvailability(map);
        setSelectedDate(null);
      } catch (e) {
        console.error("Error loading day availability", e);
        setDayAvailability({});
        setSelectedDate(null);
      } finally {
        setIsLoadingAvailability(false);
      }
    };

    loadAvailability();
  }, [selectedMasterId, monthRange.from, monthRange.to]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setEditingMaster(null);
    setForm({
      fullName: "",
      specialization: "",
      phone: "",
      isActive: "active",
      bio: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      alert("Имя мастера обязательно");
      return;
    }

    const payload = {
      fullName: form.fullName,
      specialization: form.specialization || undefined,
      phone: form.phone || undefined,
      isActive: form.isActive === "active",
      bio: form.bio || undefined,
    };

    if (editingMaster) {
      const updated = await MasterApi.update(editingMaster.id, payload);
      setMasters((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
      if (selectedMasterId === editingMaster.id) {
        setSelectedMasterId(updated.id);
      }
    } else {
      const created = await MasterApi.create(payload);
      setMasters((prev) => [created, ...prev]);
      if (!selectedMasterId) {
        setSelectedMasterId(created.id);
      }
    }

    resetForm();
  };

  const handleEdit = (master: Master) => {
    setEditingMaster(master);
    setForm({
      fullName: master.fullName,
      specialization: master.specialization || "",
      phone: master.phone || "",
      isActive: master.isActive ? "active" : "inactive",
      bio: master.bio || "",
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить мастера?")) return;
    await MasterApi.remove(id);
    setMasters((prev) => prev.filter((m) => m.id !== id));
    if (editingMaster && editingMaster.id === id) {
      resetForm();
    }
    if (selectedMasterId === id) {
      const remaining = masters.filter((m) => m.id !== id);
      setSelectedMasterId(remaining.length ? remaining[0].id : null);
      setDayAvailability({});
      setSelectedDate(null);
    }
  };

  const filteredMasters = masters.filter((master) => {
    const term = searchTerm.toLowerCase();
    const fullName = master.fullName || "";
    const specialization = master.specialization || "";
    const phone = master.phone || "";
    return (
      fullName.toLowerCase().includes(term) ||
      specialization.toLowerCase().includes(term) ||
      phone.toLowerCase().includes(term)
    );
  });

  // ==== обработчики доступности по дням ====
  const handleSelectDay = (date: Date) => {
    const iso = formatDateISO(date);
    setSelectedDate(iso);
    // если дня нет — создаём по умолчанию как выходной
    setDayAvailability((prev) => {
      if (prev[iso]) return prev;
      return {
        ...prev,
        [iso]: {
          date: iso,
          startTime: "",
          endTime: "",
          isDayOff: true,
        },
      };
    });
  };

  const handleToggleDayWorking = () => {
    if (!selectedDate) return;
    setDayAvailability((prev) => {
      const existing = prev[selectedDate];
      if (!existing) {
        return {
          ...prev,
          [selectedDate]: {
            date: selectedDate,
            startTime: "",
            endTime: "",
            isDayOff: false,
          },
        };
      }
      return {
        ...prev,
        [selectedDate]: {
          ...existing,
          isDayOff: !existing.isDayOff,
        },
      };
    });
  };

  const handleTimeChange = (field: "startTime" | "endTime", value: string) => {
    if (!selectedDate) return;
    setDayAvailability((prev) => {
      const existing = prev[selectedDate] ?? {
        date: selectedDate,
        startTime: "",
        endTime: "",
        isDayOff: false,
      };
      return {
        ...prev,
        [selectedDate]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleSaveAvailability = async () => {
    if (!selectedMasterId) return;

    setIsSavingAvailability(true);
    try {
      const fromStr = monthRange.from.toISOString().slice(0, 10);
      const toStr = monthRange.to.toISOString().slice(0, 10);

      // берём только дни текущего месяца
      const daysPayload = Object.values(dayAvailability)
        .filter((d) => {
          const dt = new Date(d.date);
          return (
            dt >= startOfMonth(currentMonth) &&
            dt <= endOfMonth(currentMonth)
          );
        })
        .map((d) => ({
          date: d.date,
          startTime: d.startTime,
          endTime: d.endTime,
          isDayOff: d.isDayOff,
        }));

      const res = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"
        }/api/masters/${selectedMasterId}/day-availability`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromStr,
            to: toStr,
            days: daysPayload,
          }),
        },
      );

      const json = await res.json();
      if (!json.success) {
        alert(json.error || "Не удалось сохранить график по дням");
        return;
      }

      alert("Месячный график сохранён");
    } catch (e) {
      console.error("Error saving day availability", e);
      alert("Ошибка при сохранении месячного графика");
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const currentMaster =
    selectedMasterId != null
      ? masters.find((m) => m.id === selectedMasterId) ?? null
      : null;

  const selectedDayData = selectedDate ? dayAvailability[selectedDate] : null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">
              Мастера и график
            </h1>
            <Link
              href="/dashboard"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ← Назад к дашборду
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        {/* Form */}
        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            {editingMaster ? "Редактирование мастера" : "Добавление мастера"}
          </h2>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div>
              <label className="mb-1 block text-sm font-medium">
                Имя мастера *
              </label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Например: Анна Петрова"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Специализация
              </label>
              <input
                type="text"
                name="specialization"
                value={form.specialization}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Тату, пирсинг, брови…"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Телефон</label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="+7…"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Статус</label>
              <select
                name="isActive"
                value={form.isActive}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 text-sm"
              >
                <option value="active">Активен</option>
                <option value="inactive">Не активен</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                Описание мастера
              </label>
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 text-sm"
                rows={3}
                placeholder="Опыт, стили, особенности…"
              />
            </div>
            <div className="mt-2 flex gap-3 md:col-span-2">
              <button
                type="submit"
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {editingMaster ? "Сохранить" : "Добавить мастера"}
              </button>
              {editingMaster && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded border px-4 py-2 text-sm"
                >
                  Отмена
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Search Bar */}
        <section>
          <input
            type="text"
            placeholder="Поиск по имени, специализации или телефону…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </section>

        {/* Masters Table */}
        <section className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Имя
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Специализация
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Телефон
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredMasters.map((master) => (
                <tr
                  key={master.id}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    master.id === selectedMasterId ? "bg-blue-50/40" : ""
                  }`}
                  onClick={() => setSelectedMasterId(master.id)}
                >
                  <td className="whitespace-nowrap px-6 py-4 font-semibold">
                    {master.fullName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {master.specialization || "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {master.phone || "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        master.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {master.isActive ? "Активен" : "Не активен"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(master);
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(master.id);
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
              {filteredMasters.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-6 text-center text-sm text-gray-500"
                  >
                    Пока нет мастеров, подходящих под поиск. Добавьте первого
                    мастера через форму выше или измените строку поиска.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Master monthly availability editor */}
        <section className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Месячный график мастера (по дням)
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Здесь задаются реальные рабочие дни и часы мастера. По ним
                строится доступность при создании записей.
              </p>
            </div>
            {currentMaster && (
              <span className="text-sm text-gray-600">
                Мастер:{" "}
                <span className="font-semibold">{currentMaster.fullName}</span>
              </span>
            )}
          </div>

          {selectedMasterId == null ? (
            <p className="text-sm text-gray-500">
              Добавьте мастера и выберите его в таблице выше, чтобы настроить
              месячный график.
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="rounded border px-2 py-1 text-sm hover:bg-gray-50"
                  >
                    ‹
                  </button>
                  <span className="text-sm font-medium">{monthLabel}</span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="rounded border px-2 py-1 text-sm hover:bg-gray-50"
                  >
                    ›
                  </button>
                </div>
                {isLoadingAvailability && (
                  <span className="text-xs text-gray-500">
                    Загружаем график по дням…
                  </span>
                )}
              </div>

              {/* Calendar grid */}
              <div className="rounded-lg border p-3">
                <div className="mb-2 grid grid-cols-7 gap-1 text-xs font-medium text-gray-500">
                  {WEEKDAY_LABELS_SHORT.map((w) => (
                    <div key={w} className="text-center">
                      {w}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 text-sm">
                  {/* Пустые ячейки до первого дня (пн=1, вс=0 → переделываем) */}
                  {(() => {
                    const first = startOfMonth(currentMonth);
                    let weekday = first.getDay(); // 0 (Вс) - 6 (Сб)
                    // делаем недельку с Пн = 0
                    weekday = weekday === 0 ? 6 : weekday - 1;
                    return Array.from({ length: weekday }).map((_, idx) => (
                      <div key={`empty-${idx}`} />
                    ));
                  })()}

                  {monthDays.map((date) => {
                    const iso = formatDateISO(date);
                    const dayNum = date.getDate();
                    const data = dayAvailability[iso];
                    const isSelected = selectedDate === iso;
                    const isWorking = data && !data.isDayOff;

                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => handleSelectDay(date)}
                        className={[
                          "flex h-10 flex-col items-center justify-center rounded border text-center",
                          isSelected
                            ? "border-indigo-600 bg-indigo-50"
                            : "border-gray-200 hover:bg-gray-50",
                          isWorking ? "bg-green-50 border-green-300" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="text-sm">{dayNum}</span>
                        {isWorking && (
                          <span className="text-[10px] text-green-700">
                            работает
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right panel: selected day details */}
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">
                    Кликните по дням, когда мастер реально работает в этом
                    месяце, и задайте часы. Можно настроить только отдельные
                    дни, если у мастера плавающее расписание.
                  </p>
                </div>
                <div className="rounded-lg border p-3 md:col-span-1">
                  <h3 className="mb-2 text-sm font-semibold">
                    Выбранный день
                  </h3>
                  {selectedDate ? (
                    <>
                      <p className="mb-2 text-xs text-gray-500">
                        Дата:{" "}
                        {new Date(selectedDate).toLocaleDateString("ru-RU")}
                      </p>
                      <label className="mb-3 inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={
                            selectedDayData ? !selectedDayData.isDayOff : false
                          }
                          onChange={handleToggleDayWorking}
                        />
                        <span>Мастер работает в этот день</span>
                      </label>
                      {selectedDayData && !selectedDayData.isDayOff && (
                        <div className="space-y-2">
                          <div>
                            <label className="mb-1 block text-xs text-gray-500">
                              Время с
                            </label>
                            <input
                              type="time"
                              value={selectedDayData.startTime}
                              onChange={(e) =>
                                handleTimeChange("startTime", e.target.value)
                              }
                              className="w-full rounded border px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-500">
                              Время до
                            </label>
                            <input
                              type="time"
                              value={selectedDayData.endTime}
                              onChange={(e) =>
                                handleTimeChange("endTime", e.target.value)
                              }
                              className="w-full rounded border px-2 py-1 text-sm"
                            />
                          </div>
                        </div>
                      )}
                      {!selectedDayData && (
                        <p className="text-xs text-gray-500">
                          День ещё не настроен. Отметьте, что мастер работает, и
                          задайте часы.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Выберите день в календаре, чтобы задать часы работы.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAvailability}
                  disabled={isSavingAvailability}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSavingAvailability
                    ? "Сохраняем график месяца…"
                    : "Сохранить график на месяц"}
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
