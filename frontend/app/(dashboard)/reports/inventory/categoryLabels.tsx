// frontend/app/(dashboard)/inventory/categoryLabels.ts
import type { InventoryCategory } from "@/app/lib/types";

export const inventoryCategoryLabels: Record<InventoryCategory, string> = {
  CONSUMABLE: "Расходники",
  JEWELRY: "Украшения",
  AFTERCARE: "Уход",
  EQUIPMENT: "Оборудование",
  OTHER: "Другое",
};
