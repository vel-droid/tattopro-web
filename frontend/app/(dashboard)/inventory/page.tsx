"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import type {
  InventoryItem,
  InventoryCategory,
  InventoryMovement,
  MovementType,
} from "../../lib/types";
import { InventoryApi } from "../../lib/api";
import ToastContainer, { type ToastItem } from "../../components/Toast";
import { inventoryCategoryLabels } from "./categoryLabels";

type FormState = {
  name: string;
  sku: string;
  quantity: string;
  minQuantity: string;
  unit: string;
  pricePerUnit: string;
  notes: string;
  category: InventoryCategory;
};

const emptyForm: FormState = {
  name: "",
  sku: "",
  quantity: "0",
  minQuantity: "0",
  unit: "шт",
  pricePerUnit: "",
  notes: "",
  category: "CONSUMABLE",
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<InventoryCategory | "ALL">("ALL");
  const [adjustValues, setAdjustValues] = useState<Record<number, string>>({});
  const [toastItems, setToastItems] = useState<ToastItem[]>([]);

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  const [movementType, setMovementType] = useState<MovementType>("OUT");
  const [movementQuantity, setMovementQuantity] = useState<number | "">("");
  const [movementReason, setMovementReason] = useState("");

  useEffect(() => {
    void loadItems();
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

  async function loadItems() {
    try {
      setLoading(true);
      setError(null);
      const data = await InventoryApi.getAll();
      setItems(data);
    } catch (e: any) {
      console.error("Inventory loading error:", e);
      setError(
        e instanceof Error
          ? e.message
          : typeof e === "string"
          ? e
          : "Не удалось загрузить склад"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadMovements(itemId: number) {
    try {
      setMovementsLoading(true);
      const data = await InventoryApi.getMovements({
        itemId,
        limit: 50,
        offset: 0,
      });
      // здесь важное исправление: getMovements возвращает массив, а не { items }
      setMovements(data);
    } catch (e: any) {
      console.error("Movements loading error:", e);
      pushToast({
        type: "error",
        message:
          e instanceof Error
            ? e.message
            : "Не удалось загрузить движения по складу",
      });
    } finally {
      setMovementsLoading(false);
    }
  }

  function handleSelectItem(item: InventoryItem) {
    setSelectedItem(item);
    void loadMovements(item.id);
  }

  function handleFormChange(field: keyof FormState, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function handleEdit(item: InventoryItem) {
    setEditingId(item.id);
    setSelectedItem(item);
    void loadMovements(item.id);

    setForm({
      name: item.name,
      sku: item.sku ?? "",
      quantity: String(item.quantity),
      minQuantity: String(item.minQuantity),
      unit: item.unit,
      pricePerUnit:
        item.pricePerUnit != null ? String(item.pricePerUnit) : "",
      notes: item.notes ?? "",
      category: item.category,
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // логирование формы перед первой валидацией
    console.log("Form data:", form);

    if (!form.name.trim()) {
      pushToast({
        type: "error",
        message: "Название обязательно",
      });
      return;
    }

    const quantity = Number(form.quantity);
    const minQuantity = Number(form.minQuantity);
    const pricePerUnit =
      form.pricePerUnit.trim() === ""
        ? null
        : Number(form.pricePerUnit);

    if (Number.isNaN(quantity) || quantity < 0) {
      pushToast({
        type: "error",
        message: "Количество должно быть неотрицательным числом",
      });
      return;
    }

    if (Number.isNaN(minQuantity) || minQuantity < 0) {
      pushToast({
        type: "error",
        message: "Минимальный остаток должен быть неотрицательным числом",
      });
      return;
    }

    if (
      pricePerUnit != null &&
      (Number.isNaN(pricePerUnit) || pricePerUnit < 0)
    ) {
      pushToast({
        type: "error",
        message: "Цена за единицу должна быть неотрицательным числом",
      });
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        quantity,
        minQuantity,
        unit: form.unit.trim() || "шт",
        pricePerUnit,
        isActive: true,
        notes: form.notes.trim() || null,
        category: form.category,
      };

      if (editingId == null) {
        const created = await InventoryApi.create(payload);
        setItems((prev) => [created, ...prev]);
        pushToast({
          type: "success",
          message: "Позиция добавлена",
        });
      } else {
        const updated = await InventoryApi.update(editingId, payload);
        setItems((prev) =>
          prev.map((i) => (i.id === updated.id ? updated : i))
        );
        if (selectedItem && selectedItem.id === updated.id) {
          setSelectedItem(updated);
        }
        pushToast({
          type: "success",
          message: "Позиция обновлена",
        });
      }

      resetForm();
    } catch (e: any) {
      pushToast({
        type: "error",
        message:
          e.message ??
          (editingId == null
            ? "Не удалось создать позицию"
            : "Не удалось обновить позицию"),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(item: InventoryItem) {
    try {
      const updated = await InventoryApi.update(item.id, {
        ...item,
        isActive: !item.isActive,
      });
      setItems((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      );
      if (selectedItem && selectedItem.id === updated.id) {
        setSelectedItem(updated);
      }
    } catch (e: any) {
      pushToast({
        type: "error",
        message: e.message ?? "Не удалось изменить статус позиции",
      });
    }
  }

  function handleAdjustChange(id: number, value: string) {
    setAdjustValues((prev) => ({
      ...prev,
      [id]: value,
    }));
  }

  async function handleAdjustQuantity(item: InventoryItem) {
    const raw = adjustValues[item.id] ?? "";
    const value = Number(raw);

    if (!raw.trim() || Number.isNaN(value)) {
      pushToast({
        type: "error",
        message: "Введите число для списания",
      });
      return;
    }

    if (value <= 0) {
      pushToast({
        type: "error",
        message: "Списываемое количество должно быть больше 0",
      });
      return;
    }

    try {
      const result = await InventoryApi.createMovement({
        itemId: item.id,
        type: "OUT",
        quantity: value,
        reason: "Списание через склад",
      });

      setItems((prev) =>
        prev.map((i) => (i.id === result.item.id ? result.item : i))
      );
      if (selectedItem && selectedItem.id === item.id) {
        setSelectedItem(result.item);
        setMovements((prev) => [result.movement, ...prev]);
      }

      setAdjustValues((prev) => ({ ...prev, [item.id]: "" }));
      pushToast({
        type: "success",
        message: `Списано ${value} ${item.unit}`,
      });
    } catch (e: any) {
      pushToast({
        type: "error",
        message: e.message ?? "Не удалось списать количество",
      });
    }
  }

  async function handleCreateMovement() {
    if (!selectedItem) {
      pushToast({ type: "error", message: "Сначала выбери позицию склада" });
      return;
    }
    if (movementQuantity === "" || Number(movementQuantity) === 0) {
      pushToast({
        type: "error",
        message: "Количество должно быть не нулевым",
      });
      return;
    }

    try {
      const qty = Number(movementQuantity);
      const result = await InventoryApi.createMovement({
        itemId: selectedItem.id,
        type: movementType,
        quantity: qty,
        reason: movementReason.trim() || undefined,
      });

      setItems((prev) =>
        prev.map((i) => (i.id === result.item.id ? result.item : i))
      );
      setSelectedItem(result.item);
      setMovements((prev) => [result.movement, ...prev]);

      setMovementQuantity("");
      setMovementReason("");

      pushToast({
        type: "success",
        message: "Движение по складу записано",
      });
    } catch (e: any) {
      pushToast({
        type: "error",
        message: e.message ?? "Не удалось создать движение по складу",
      });
    }
  }

  const filteredItems = useMemo(
    () =>
      selectedCategory === "ALL"
        ? items
        : items.filter((i) => i.category === selectedCategory),
    [items, selectedCategory]
  );

  const totalItems = items.length;
  const lowStockCount = items.filter(
    (i) => i.quantity > 0 && i.quantity <= i.minQuantity
  ).length;
  const outOfStockCount = items.filter((i) => i.quantity === 0).length;

  const hasFilteredItems = filteredItems.length > 0;

  return (
    <div className="space-y-6">
      {/* Заголовок и метрики */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Склад
          </h1>
          <p className="text-sm text-gray-500">
            Управление расходниками, украшениями и другими позициями.
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Всего позиций</div>
          <div className="mt-2 text-2xl font-semibold">{totalItems}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">
            С низким остатком (≤ min)
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {lowStockCount}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Нет в наличии</div>
          <div className="mt-2 text-2xl font-semibold">
            {outOfStockCount}
          </div>
        </div>
      </section>

      {/* Форма позиции */}
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">
            {editingId == null
              ? "Добавить позицию"
              : "Редактировать позицию"}
          </h2>
          {editingId != null && (
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
          className="grid gap-4 md:grid-cols-3"
          onSubmit={handleSubmit}
        >
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Название *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              className="mt-1 block w-full rounded-md border px-2 py-1 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Артикул / SKU
            </label>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => handleFormChange("sku", e.target.value)}
              className="mt-1 block w-full rounded-md border px-2 py-1 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Количество
            </label>
            <input
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) =>
                handleFormChange("quantity", e.target.value)
              }
              className="mt-1 block w-full rounded-md border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Минимальный остаток
            </label>
            <input
              type="number"
              min={0}
              value={form.minQuantity}
              onChange={(e) =>
                handleFormChange("minQuantity", e.target.value)
              }
              className="mt-1 block w-full rounded-md border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Единица
            </label>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => handleFormChange("unit", e.target.value)}
              className="mt-1 block w-full rounded-md border px-2 py-1 text-sm"
              placeholder="шт, упаковка, мл"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Цена за единицу
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.pricePerUnit}
              onChange={(e) =>
                handleFormChange("pricePerUnit", e.target.value)
              }
              className="mt-1 block w-full rounded-md border px-2 py-1 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Категория
            </label>
            <select
              value={form.category}
              onChange={(e) =>
                handleFormChange(
                  "category",
                  e.target.value as InventoryCategory
                )
              }
              className="mt-1 block w-full rounded-md border px-2 py-1 text-sm"
            >
              <option value="CONSUMABLE">
                {inventoryCategoryLabels.CONSUMABLE}
              </option>
              <option value="JEWELRY">
                {inventoryCategoryLabels.JEWELRY}
              </option>
              <option value="AFTERCARE">
                {inventoryCategoryLabels.AFTERCARE}
              </option>
              <option value="EQUIPMENT">
                {inventoryCategoryLabels.EQUIPMENT}
              </option>
              <option value="OTHER">
                {inventoryCategoryLabels.OTHER}
              </option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700">
              Заметки
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => handleFormChange("notes", e.target.value)}
              className="mt-1 block w-full rounded-md border px-2 py-1 text-sm"
            />
          </div>

          <div className="md:col-span-3 flex justify-end gap-3">
            {editingId != null && (
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
                : editingId == null
                ? "Добавить позицию"
                : "Сохранить изменения"}
            </button>
          </div>
        </form>
      </section>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Таблица склада */}
      <section className="rounded-lg border bg_WHITE p-4 shadow-sm bg-white">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-medium">Все позиции</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">
              Категория:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(
                  (e.target.value as InventoryCategory | "ALL") || "ALL"
                )
              }
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Все категории</option>
              <option value="CONSUMABLE">
                {inventoryCategoryLabels.CONSUMABLE}
              </option>
              <option value="JEWELRY">
                {inventoryCategoryLabels.JEWELRY}
              </option>
              <option value="AFTERCARE">
                {inventoryCategoryLabels.AFTERCARE}
              </option>
              <option value="EQUIPMENT">
                {inventoryCategoryLabels.EQUIPMENT}
              </option>
              <option value="OTHER">
                {inventoryCategoryLabels.OTHER}
              </option>
            </select>
            {loading && (
              <span className="text-xs text-gray-500">Загрузка…</span>
            )}
          </div>
        </div>

        {!hasFilteredItems && !loading ? (
          <div className="rounded border border-dashed bg_WHITE px-4 py-6 text-sm text-gray-500 bg-white">
            Пока нет позиций на складе. Добавьте первую через форму выше.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">
                    Название
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">
                    Категория
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">
                    Остаток
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">
                    Мин. остаток
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">
                    Статус
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">
                    Списать
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.sku || "—"}
                      </div>
                      {item.notes && (
                        <div className="text-xs text-gray-500">
                          {item.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {inventoryCategoryLabels[item.category]}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {item.minQuantity} {item.unit}
                    </td>
                    <td className="px-4 py-2">
                      {item.quantity === 0 ? (
                        <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          нет в наличии
                        </span>
                      ) : item.quantity <= item.minQuantity ? (
                        <span className="inline-flex rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                          низкий остаток
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          ок
                        </span>
                      )}{" "}
                      {!item.isActive && (
                        <span className="ml-1 inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                          скрыта
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={adjustValues[item.id] ?? ""}
                          onChange={(e) =>
                            handleAdjustChange(item.id, e.target.value)
                          }
                          className="w-20 rounded-md border px-2 py-1 text-xs"
                          placeholder="шт"
                        />
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            void handleAdjustQuantity(item);
                          }}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          Списать
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleEdit(item);
                          }}
                          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          Редактировать
                        </button>
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            void handleToggleActive(item);
                          }}
                          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          {item.isActive ? "Скрыть" : "Показать"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* История движений */}
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">История движений</h2>

        {!selectedItem ? (
          <p className="text-sm text-gray-500">
            Выбери позицию в таблице склада, чтобы увидеть её историю.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-500">
              Позиция:{" "}
              <span className="font-medium text-gray-900">
                {selectedItem.name}
              </span>{" "}
              — остаток{" "}
              <span className="font-semibold">
                {selectedItem.quantity}
              </span>{" "}
              {selectedItem.unit} | категория{" "}
              <span className="font-medium">
                {inventoryCategoryLabels[selectedItem.category]}
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleCreateMovement();
              }}
              className="grid items-end gap-3 md:grid-cols-4"
            >
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Тип
                </label>
                <select
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={movementType}
                  onChange={(e) =>
                    setMovementType(e.target.value as MovementType)
                  }
                >
                  <option value="OUT">Расход (OUT)</option>
                  <option value="IN">Приход (IN)</option>
                  <option value="ADJUST">Корректировка (ADJUST)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Количество
                </label>
                <input
                  type="number"
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={movementQuantity}
                  onChange={(e) =>
                    setMovementQuantity(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Причина
                </label>
                <input
                  type="text"
                  className="w-full rounded border px-3 py-2 text-sm"
                  placeholder="Например: расход на сеанс, закупка, инвентаризация…"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                />
              </div>
              <div className="md:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Записать движение
                </button>
              </div>
            </form>

            {movementsLoading ? (
              <p className="text-sm text-gray-500">
                Загрузка истории…
              </p>
            ) : movements.length === 0 ? (
              <p className="text-sm text-gray-500">
                Пока нет движений по этой позиции.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">
                        Дата
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">
                        Тип
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-gray-700">
                        Кол-во
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">
                        Причина
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {movements.map((m) => {
                      const d = new Date(m.createdAt);
                      const dateStr = d.toLocaleString("ru-RU", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <tr key={m.id}>
                          <td className="px-4 py-2 text-gray-700">
                            {dateStr}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                m.type === "IN"
                                  ? "bg-green-100 text-green-800"
                                  : m.type === "OUT"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {m.type}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {m.quantity}
                          </td>
                          <td className="px-4 py-2 text-gray-700">
                            {m.reason ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      <ToastContainer toasts={toastItems} onClose={handleRemoveToast} />
    </div>
  );
}
