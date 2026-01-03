// frontend/app/lib/api.ts

import type {
  InventoryItem,
  InventoryCategory,
  InventoryMovement,
  MovementType,
  LowStockResponse,
  InventoryOutReportResponse,
  MasterUtilizationResponse,
  ClientsReportResponse,
  Client,
  Master,
  Appointment,
  AppointmentListResponse,
  AppointmentStatsResponse,
  AppointmentStatus,
  RevenueReportResponse,
  Service,
  ServiceCategory,
  ServicesRevenueReportResponse,
} from "./types";

// Универсальный формат ответа бекенда
export type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
  code?: string;
};

// Базовый URL бекенда
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

// ===== БАЗОВЫЕ ХЕЛПЕРЫ =====

async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<T> {
  const url = new URL(path, API_BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    const message = json.error || "API error";
    throw new Error(message);
  }

  return json.data;
}

async function apiPost<T>(path: string, body: any): Promise<T> {
  const url = new URL(path, API_BASE_URL);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    const message = json.error || "API error";
    throw new Error(message);
  }

  return json.data;
}

async function apiPut<T>(path: string, body: any): Promise<T> {
  const url = new URL(path, API_BASE_URL);
  const res = await fetch(url.toString(), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    const message = json.error || "API error";
    throw new Error(message);
  }

  return json.data;
}

async function apiDelete<T>(path: string): Promise<T> {
  const url = new URL(path, API_BASE_URL);
  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    const message = json.error || "API error";
    throw new Error(message);
  }

  return json.data;
}

// ============= CLIENT API =============

export const ClientApi = {
  getAll(): Promise<Client[]> {
    return apiGet<Client[]>("/api/clients");
  },

  create(data: {
    fullName: string;
    phone: string;
    email?: string | null;
    notes?: string | null;
    birthDate?: string | null;
  }): Promise<Client> {
    return apiPost<Client>("/api/clients", data);
  },

  update(id: number, data: Partial<Client>): Promise<Client> {
    return apiPut<Client>(`/api/clients/${id}`, data);
  },

  delete(id: number): Promise<boolean> {
    return apiDelete<boolean>(`/api/clients/${id}`);
  },

  getProblemClients(params?: {
    minNoShow?: number;
    limit?: number;
  }): Promise<Client[]> {
    return apiGet<Client[]>("/api/clients/problem", params);
  },
};

// ============= MASTER API =============

export const MasterApi = {
  getAll(): Promise<Master[]> {
    return apiGet<Master[]>("/api/masters");
  },

  create(data: {
    fullName: string;
    specialization?: string;
    phone?: string;
    isActive?: boolean;
    bio?: string;
  }): Promise<Master> {
    return apiPost<Master>("/api/masters", data);
  },

  update(id: number, data: Partial<Master>): Promise<Master> {
    return apiPut<Master>(`/api/masters/${id}`, data);
  },

  delete(id: number): Promise<boolean> {
    return apiDelete<boolean>(`/api/masters/${id}`);
  },
};

// ============= SERVICE API =============

export const ServiceApi = {
  getAll(params?: {
    includeInactive?: boolean;
    category?: ServiceCategory;
  }): Promise<Service[]> {
    return apiGet<Service[]>("/api/services", params);
  },

  create(data: {
    name: string;
    category: ServiceCategory;
    basePrice?: number | null;
    defaultDurationMinutes?: number | null;
    isActive?: boolean;
    notes?: string | null;
  }): Promise<Service> {
    return apiPost<Service>("/api/services", data);
  },

  update(
    id: number,
    data: Partial<{
      name: string;
      category: ServiceCategory;
      basePrice: number | null;
      defaultDurationMinutes: number | null;
      isActive: boolean;
      notes: string | null;
    }>,
  ): Promise<Service> {
    return apiPut<Service>(`/api/services/${id}`, data);
  },

  delete(id: number): Promise<boolean> {
    return apiDelete<boolean>(`/api/services/${id}`);
  },
};

// ============= APPOINTMENT API =============

export const AppointmentApi = {
  getAppointments(params: {
    limit?: number;
    offset?: number;
    status?: AppointmentStatus | "ALL";
    masterId?: number;
    from?: string;
    to?: string;
  }): Promise<AppointmentListResponse> {
    return apiGet<AppointmentListResponse>("/api/appointments", params);
  },

  createAppointment(data: {
    clientId: number;
    masterId: number;
    serviceId?: number | null;
    serviceName: string;
    price: number;
    startsAt: string;
    endsAt: string;
    notes?: string;
  }): Promise<Appointment> {
    return apiPost<Appointment>("/api/appointments", data);
  },

  updateAppointment(
    id: number,
    data: Partial<{
      serviceId: number | null;
      serviceName: string;
      price: number;
      startsAt: string;
      endsAt: string;
      status: AppointmentStatus;
      notes: string | null;
    }>,
  ): Promise<Appointment> {
    return apiPut<Appointment>(`/api/appointments/${id}`, data);
  },

  deleteAppointment(id: number): Promise<boolean> {
    return apiDelete<boolean>(`/api/appointments/${id}`);
  },

  getStats(params: {
    from: string;
    to: string;
    masterId?: number;
  }): Promise<AppointmentStatsResponse> {
    return apiGet<AppointmentStatsResponse>("/api/stats/appointments", params);
  },
};

// ============= INVENTORY API =============

export const InventoryApi = {
  async getAll(): Promise<InventoryItem[]> {
    return apiGet<InventoryItem[]>("/api/inventory");
  },

  async create(data: {
    name: string;
    unit: string;
    sku?: string | null;
    quantity?: number;
    minQuantity?: number;
    pricePerUnit?: number | null;
    isActive?: boolean;
    notes?: string | null;
    category: InventoryCategory;
  }): Promise<InventoryItem> {
    return apiPost<InventoryItem>("/api/inventory", data);
  },

  async update(
    id: number,
    data: Partial<{
      name: string;
      unit: string;
      sku: string | null;
      quantity: number;
      minQuantity: number;
      pricePerUnit: number | null;
      isActive: boolean;
      notes: string | null;
      category: InventoryCategory;
    }>,
  ): Promise<InventoryItem> {
    return apiPut<InventoryItem>(`/api/inventory/${id}`, data);
  },

  async delete(id: number): Promise<boolean> {
    return apiDelete<boolean>(`/api/inventory/${id}`);
  },

  async getMovements(params: {
    itemId?: number;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    items: InventoryMovement[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return apiGet<{
      items: InventoryMovement[];
      total: number;
      limit: number;
      offset: number;
    }>("/api/inventory-movements", params);
  },

  async createMovement(data: {
    itemId: number;
    type: MovementType;
    quantity: number;
    reason?: string | null;
  }): Promise<{ movement: InventoryMovement; item: InventoryItem }> {
    return apiPost<{ movement: InventoryMovement; item: InventoryItem }>(
      "/api/inventory-movements",
      data,
    );
  },

  async getOutReport(params: {
    from: string;
    to: string;
  }): Promise<InventoryOutReportResponse> {
    return apiGet<InventoryOutReportResponse>(
      "/api/reports/inventory-out",
      params,
    );
  },

  async getLowStock(params: { limit?: number } = {}): Promise<LowStockResponse> {
    return apiGet<LowStockResponse>("/inventory/low-stock", params);
  },
};

// ============= REPORTS API =============

export const ReportsApi = {
  async getRevenueReport(params: {
    from: string;
    to: string;
    masterId?: number;
  }): Promise<RevenueReportResponse> {
    return apiGet<RevenueReportResponse>("/api/reports/revenue", params);
  },

  async getInventoryOutReport(params: {
    from: string;
    to: string;
  }): Promise<InventoryOutReportResponse> {
    return apiGet<InventoryOutReportResponse>(
      "/api/reports/inventory-out",
      params,
    );
  },

  async getMasterUtilization(params: {
    from: string;
    to: string;
  }): Promise<MasterUtilizationResponse> {
    return apiGet<MasterUtilizationResponse>(
      "/api/stats/master-utilization",
      params,
    );
  },

  async getClientsReport(params: {
    from: string;
    to: string;
  }): Promise<ClientsReportResponse> {
    return apiGet<ClientsReportResponse>("/api/reports/clients", params);
  },

  // 👉 новый метод под /api/reports/services
  async getServicesRevenueReport(params: {
    from: string;
    to: string;
  }): Promise<ServicesRevenueReportResponse> {
    return apiGet<ServicesRevenueReportResponse>(
      "/api/reports/services",
      params,
    );
  },
};
