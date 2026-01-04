// app/lib/types.ts

// ==== ENUM‑СТАТУСЫ ====

export type AppointmentStatus =
  | "PENDING"
  | "APPROVED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type ClientStatus = "REGULAR" | "VIP" | "RISK";

export type InventoryCategory =
  | "CONSUMABLE"
  | "JEWELRY"
  | "AFTERCARE"
  | "EQUIPMENT"
  | "OTHER";

export type MovementType = "IN" | "OUT" | "ADJUST";

// категории услуг соответствуют enum ServiceCategory в Prisma

export type ServiceCategory =
  | "TATTOO"
  | "PIERCING"
  | "BEAUTY"
  | "CONSULTATION"
  | "OTHER";

// ==== CORE‑ТИПЫ ====

export type Client = {
  id: number;
  fullName: string;
  phone: string;
  email: string | null;
  birthDate?: string | null;
  notes: string | null;
  isBlocked: boolean;
  noShowCount: number;
  status: ClientStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type Master = {
  id: number;
  fullName: string;
  specialization?: string | null;
  phone?: string | null;
  isActive: boolean;
  bio?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

// Справочник услуг (прямая проекция модели Service)

export type Service = {
  id: number;
  name: string;
  category: ServiceCategory;
  basePrice: number | null;
  defaultDurationMinutes: number | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Appointment = {
  id: number;
  clientId: number;
  masterId: number;
  serviceId: number | null; // ссылка на справочник услуг (может быть null)
  client: Client;
  master: Master;
  service?: Service | null; // если include service на бэке
  serviceName: string;
  price: number;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  notes?: string | null;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
};

export interface AppointmentListResponse {
  success: boolean;
  data: {
    items: Appointment[];
    total: number;
  } | null;
  error: string | null;
}

export type CreateAppointmentInput = {
  clientId: number;
  masterId: number;
  serviceId?: number | null; // опционально при создании
  serviceName: string;
  price: number;
  startsAt: string;
  endsAt: string;
  notes?: string;
};

// ==== INVENTORY ====

export type InventoryItem = {
  id: number;
  name: string;
  sku?: string | null;
  quantity: number;
  minQuantity: number;
  unit: string;
  pricePerUnit?: number | null;
  isActive: boolean;
  notes?: string | null;
  category: InventoryCategory;
  createdAt: string;
  updatedAt: string;
};

export type InventoryMovement = {
  id: number;
  itemId: number;
  type: MovementType;
  quantity: number;
  reason?: string | null;
  createdAt: string;
  item?: InventoryItem;
};

// === LOW STOCK (dashboard) ===

export interface LowStockItem {
  id: number;
  name: string;
  quantity: number;
  category: InventoryCategory;
}

export interface LowStockResponse {
  count: number;
  items: LowStockItem[];
}

// ===== REPORTS: INVENTORY OUT (списание со склада) =====

export type InventoryOutReportItem = {
  // именно этот тип используется в FinanceReportsPage
  category: InventoryCategory;
  totalQuantity: number;
  approxCost?: number | null; // <-- ВАЖНО: добавить это поле
};

export type InventoryOutReportSummary = {
  totalQuantity: number;
  approxCost?: number | null;
};

export type InventoryOutReportResponse = {
  range: {
    from: string;
    to: string;
  };
  summary: InventoryOutReportSummary;
  items: InventoryOutReportItem[];
};

// ===== REPORTS: REVENUE BY MASTERS + SERVICES =====

export interface RevenueReportItem {
  masterId: number;
  masterName: string;
  revenue: number;
  count: number;
  /**
   * Массив id клиентов, у которых были визиты у этого мастера в диапазоне.
   * Нужен для KPI "выручка / клиент с визитом".
   */
  clientIds?: number[];
}

// выручка по отдельным услугам
export interface RevenueByServiceItem {
  serviceId: number | null;
  serviceName: string | null;
  serviceCategory: ServiceCategory;
  appointmentsCount: number;
  totalRevenue: number;
}

// выручка по категориям услуг
export interface RevenueByServiceCategoryItem {
  category: ServiceCategory | "OTHER";
  appointmentsCount: number;
  totalRevenue: number;
}

export interface RevenueServicesReport {
  byService: RevenueByServiceItem[];
  byCategory: RevenueByServiceCategoryItem[];
}

export interface RevenueReportResponse {
  range: {
    from: string;
    to: string;
  };
  totalRevenue: number;
  items: RevenueReportItem[];
  /**
   * Детализация по услугам и категориям услуг.
   * Наполняется из /api/reports/services.
   */
  servicesReport?: RevenueServicesReport;
}

// ===== REPORTS: MASTER UTILIZATION =====

export type MasterUtilizationItem = {
  masterId: number;
  masterName: string;
  appointmentsCount: number;
  bookedMinutes: number;
};

export type MasterUtilizationResponse = {
  range: {
    from: string;
    to: string;
  };
  items: MasterUtilizationItem[];
};

// ===== REPORTS: CLIENTS =====

export type ClientReportItem = {
  clientId: number;
  fullName: string;
  phone: string | null;
  email: string | null;
  status: ClientStatus;
  noShowCount: number;
  firstVisit: string | null;
  lastVisit: string | null;
  totalVisits: number;
  visitsInRange: number;
  revenueInRange: number;
  isNewInRange: boolean;
};

export type ClientsReportSummary = {
  newCount: number;
  newRevenue: number;
  repeatCount: number;
  repeatRevenue: number;
  riskCount: number;
};

export type ClientsReportResponse = {
  range: {
    from: string;
    to: string;
  };
  summary: ClientsReportSummary;
  items: ClientReportItem[];
};

// ===== DASHBOARD: APPOINTMENT STATS =====

export interface AppointmentStatsResponse {
  totalAppointments: number;
  totalCompleted: number;
  totalRevenue: number;
  countsByStatus: Record<string, number>;
}

// ===== REPORTS: SERVICES (выручка по услугам и категориям) =====

export type ServicesRevenueByServiceItem = {
  serviceId: number | null;
  serviceName: string | null;
  serviceCategory: ServiceCategory;
  appointmentsCount: number;
  totalRevenue: number; // <-- добавить это поле
};

export type ServicesRevenueByCategoryItem = {
  category: ServiceCategory | "OTHER";
  appointmentsCount: number;
  totalRevenue: number; // <-- и здесь
};

export type ServicesRevenueSummary = {
  totalRevenue: number;
  totalCount: number;
};

export type ServicesRevenueReportResponse = {
  range: {
    from: string;
    to: string;
  };
  summary: ServicesRevenueSummary;
  byService: ServicesRevenueByServiceItem[];
  byCategory: ServicesRevenueByCategoryItem[];
};

