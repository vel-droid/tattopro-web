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

// Universal backend API response format
export type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
  code?: string;
};

// Base API URL
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ===== BASIC HELPERS =====
/**
 * Handle API response with proper error handling
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    try {
      const error = JSON.parse(errorText);
      throw new Error(error.message || `API Error: ${response.status}`);
    } catch (e) {
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
  }

  try {
    const json = await response.json();
    return json as T;
  } catch (parseError) {
    console.error("Failed to parse JSON response:", parseError);
    throw new Error(
      `Invalid JSON response from server: ${response.status}`
    );
  }
}

// ===== CLIENT API =====
export const ClientApi = {
  async getAll(): Promise<Client[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/clients`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await handleResponse<ApiResponse<Client[]>>(response);
      return data.data || [];
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch clients"
      );
    }
  },

  async create(clientData: Partial<Client>): Promise<Client> {
    try {
      const response = await fetch(`${BASE_URL}/api/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientData),
      });
      const data = await handleResponse<ApiResponse<Client>>(response);
      return data.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to create client"
      );
    }
  },

  async update(
    id: string | number,
    clientData: Partial<Client>
  ): Promise<Client> {
    try {
      const response = await fetch(`${BASE_URL}/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientData),
      });
      const data = await handleResponse<ApiResponse<Client>>(response);
      return data.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to update client"
      );
    }
  },
};

// ===== MASTER API =====
export const MasterApi = {
  async getAll(): Promise<Master[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/masters`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await handleResponse<ApiResponse<Master[]>>(response);
      return data.data || [];
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch masters"
      );
    }
  },

  async create(masterData: Partial<Master>): Promise<Master> {
    try {
      const response = await fetch(`${BASE_URL}/api/masters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(masterData),
      });
      const data = await handleResponse<ApiResponse<Master>>(response);
      return data.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to create master"
      );
    }
  },

  async update(
    id: string | number,
    masterData: Partial<Master>
  ): Promise<Master> {
    try {
      const response = await fetch(`${BASE_URL}/api/masters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(masterData),
      });
      const data = await handleResponse<ApiResponse<Master>>(response);
      return data.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to update master"
      );
    }
  },

  async delete(id: string | number): Promise<void> {
    try {
      const response = await fetch(`${BASE_URL}/api/masters/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      await handleResponse<void>(response);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to delete master"
      );
    }
  },
};

// ===== APPOINTMENT API =====
export const AppointmentApi = {
  async getAppointments(
    params: {
      startDate?: string;
      endDate?: string;
      masterId?: number | string;
      clientId?: number | string;
      status?: AppointmentStatus;
      limit?: number;
      offset?: number;
      from?: string;
      to?: string;
    } = {}
  ): Promise<AppointmentListResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.startDate) queryParams.append("startDate", params.startDate);
      if (params.endDate) queryParams.append("endDate", params.endDate);
      if (params.masterId)
        queryParams.append("masterId", String(params.masterId));
      if (params.clientId)
        queryParams.append("clientId", String(params.clientId));
      if (params.status) queryParams.append("status", params.status);
      if (params.limit) queryParams.append("limit", params.limit.toString());
      if (params.offset)
        queryParams.append("offset", params.offset.toString());
      if (params.from) queryParams.append("from", params.from);
      if (params.to) queryParams.append("to", params.to);

      const response = await fetch(
        `${BASE_URL}/api/appointments?${queryParams.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await handleResponse<AppointmentListResponse>(response);
      return data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to fetch appointments"
      );
    }
  },

  async getStats(
    params: {
      startDate?: string;
      endDate?: string;
      from?: string;
      to?: string;
    } = {}
  ): Promise<AppointmentStatsResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.startDate) queryParams.append("startDate", params.startDate);
      if (params.endDate) queryParams.append("endDate", params.endDate);
      if (params.from) queryParams.append("from", params.from);
      if (params.to) queryParams.append("to", params.to);

      const response = await fetch(
        `${BASE_URL}/api/stats/appointments?${queryParams.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await handleResponse<ApiResponse<AppointmentStatsResponse>>(
        response
      );
      return data.data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to fetch appointment stats"
      );
    }
  },

  async createAppointment(
    appointmentData: Partial<Appointment>
  ): Promise<Appointment> {
    try {
      const response = await fetch(`${BASE_URL}/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentData),
      });
      const data = await handleResponse<ApiResponse<Appointment>>(response);
      return data.data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to create appointment"
      );
    }
  },

  async updateAppointment(
    id: string | number,
    appointmentData: Partial<Appointment>
  ): Promise<Appointment> {
    try {
      const response = await fetch(`${BASE_URL}/api/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentData),
      });
      const data = await handleResponse<ApiResponse<Appointment>>(response);
      return data.data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to update appointment"
      );
    }
  },

  async deleteAppointment(id: string | number): Promise<void> {
    try {
      const response = await fetch(`${BASE_URL}/api/appointments/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      await handleResponse<void>(response);
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to delete appointment"
      );
    }
  },
};

// ===== INVENTORY API =====
export const InventoryApi = {
  async getLowStock(
    params: { limit?: number } = {}
  ): Promise<LowStockResponse[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append("limit", params.limit.toString());

      const response = await fetch(
        `${BASE_URL}/api/reports/inventory-low-stock?${queryParams.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await handleResponse<ApiResponse<LowStockResponse[]>>(
        response
      );
      return data.data || [];
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to fetch low stock items"
      );
    }
  },

  async getAll(): Promise<InventoryItem[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/inventory`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await handleResponse<ApiResponse<InventoryItem[]>>(
        response
      );
      return data.data || [];
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch inventory"
      );
    }
  },

  async getMovements(
    params?: {
      itemId?: number;
      limit?: number;
      offset?: number;
    }
  ): Promise<InventoryMovement[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.itemId)
        queryParams.append("itemId", params.itemId.toString());
      if (params?.limit)
        queryParams.append("limit", params.limit.toString());
      if (params?.offset)
        queryParams.append("offset", params.offset.toString());

      const response = await fetch(
        `${BASE_URL}/api/inventory/movements?${queryParams.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await handleResponse<ApiResponse<InventoryMovement[]>>(
        response
      );
      return data.data || [];
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to fetch inventory movements"
      );
    }
  },

  async create(payload: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
      const response = await fetch(`${BASE_URL}/api/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await handleResponse<ApiResponse<InventoryItem>>(response);
      return data.data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to create inventory item"
      );
    }
  },

  async update(
    id: string | number,
    payload: Partial<InventoryItem>
  ): Promise<InventoryItem> {
    try {
      const response = await fetch(`${BASE_URL}/api/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await handleResponse<ApiResponse<InventoryItem>>(response);
      return data.data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to update inventory item"
      );
    }
  },

  async createMovement(payload: {
    itemId: number;
    type: MovementType;
    quantity: number;
    reason?: string;
  }): Promise<{ item: InventoryItem; movement: InventoryMovement }> {
    try {
      const response = await fetch(`${BASE_URL}/api/inventory/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await handleResponse<
        ApiResponse<{ item: InventoryItem; movement: InventoryMovement }>
      >(response);
      return data.data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to create inventory movement"
      );
    }
  },

  async getOutReport(
    params?: {
      from?: string;
      to?: string;
    }
  ): Promise<InventoryOutReportResponse[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.from) queryParams.append("from", params.from);
      if (params?.to) queryParams.append("to", params.to);

      const response = await fetch(
        `${BASE_URL}/api/inventory/out-report?${queryParams.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data =
        await handleResponse<ApiResponse<InventoryOutReportResponse[]>>(
          response
        );
      return data.data || [];
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch out report"
      );
    }
  },
};

// ===== SERVICE API =====
export const ServiceApi = {
  async getAll(): Promise<Service[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/services`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await handleResponse<ApiResponse<Service[]>>(response);
      return data.data || [];
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch services"
      );
    }
  },

  async update(
    id: string | number,
    serviceData: Partial<Service>
  ): Promise<Service> {
    try {
      const response = await fetch(`${BASE_URL}/api/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceData),
      });
      const data = await handleResponse<ApiResponse<Service>>(response);
      return data.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to update service"
      );
    }
  },
};

// ===== REPORTS / FINANCE API =====
export const ReportsApi = {
  // Общий отчёт по выручке
  async getRevenueReport(params: {
    from: string;
    to: string;
  }): Promise<RevenueReportResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.from) queryParams.append("from", params.from);
      if (params.to) queryParams.append("to", params.to);

      const response = await fetch(
        `${BASE_URL}/api/reports/revenue?${queryParams.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data =
        await handleResponse<ApiResponse<RevenueReportResponse>>(response);
      return data.data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to fetch revenue report"
      );
    }
  },

  // Отчёт по выручке по услугам
  async getServicesRevenueReport(params: {
    from: string;
    to: string;
  }): Promise<ServicesRevenueReportResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.from) queryParams.append("from", params.from);
      if (params.to) queryParams.append("to", params.to);

      const response = await fetch(
        `${BASE_URL}/api/reports/services-revenue?${queryParams.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data =
        await handleResponse<ApiResponse<ServicesRevenueReportResponse>>(
          response
        );
      return data.data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to fetch services revenue report"
      );
    }
  },

  // Отчёт по загрузке мастеров
  async getMasterUtilization(params: {
    from: string;
    to: string;
  }): Promise<MasterUtilizationResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.from) queryParams.append("from", params.from);
      if (params.to) queryParams.append("to", params.to);

      const response = await fetch(
        `${BASE_URL}/api/reports/master-utilization?${queryParams.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data =
        await handleResponse<ApiResponse<MasterUtilizationResponse>>(
          response
        );
      return data.data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to fetch master utilization report"
      );
    }
  },
};
