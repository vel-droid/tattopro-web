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
 * Handle API response
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    try {
      const error = JSON.parse(errorText);
      throw new Error(error.message || `API Error: ${response.status}`);
    } catch {
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
  }
  return response.json();
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
};

// ===== APPOINTMENT API =====

export const AppointmentApi = {
  async getAppointments(params: {
    startDate?: string;
    endDate?: string;
    masterId?: string;
    clientId?: string;
    status?: AppointmentStatus;
  } = {}): Promise<Appointment[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params.startDate) queryParams.append("startDate", params.startDate);
      if (params.endDate) queryParams.append("endDate", params.endDate);
      if (params.masterId) queryParams.append("masterId", params.masterId);
      if (params.clientId) queryParams.append("clientId", params.clientId);
      if (params.status) queryParams.append("status", params.status);

      const response = await fetch(
        `${BASE_URL}/api/appointments?${queryParams.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await handleResponse<ApiResponse<Appointment[]>>(response);
      return data.data || [];
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch appointments"
      );
    }
  },

  async getStats(params: {
    startDate?: string;
    endDate?: string;
  } = {}): Promise<AppointmentStatsResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.startDate) queryParams.append("startDate", params.startDate);
      if (params.endDate) queryParams.append("endDate", params.endDate);

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
        error instanceof Error ? error.message : "Failed to fetch appointment stats"
      );
    }
  },

  async createAppointment(appointmentData: Partial<Appointment>): Promise<Appointment> {
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
        error instanceof Error ? error.message : "Failed to create appointment"
      );
    }
  },

  async updateAppointment(id: string, appointmentData: Partial<Appointment>): Promise<Appointment> {
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
        error instanceof Error ? error.message : "Failed to update appointment"
      );
    }
  },

  async deleteAppointment(id: string): Promise<void> {
    try {
      const response = await fetch(`${BASE_URL}/api/appointments/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      await handleResponse<void>(response);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to delete appointment"
      );
    }
  },
};

// ===== INVENTORY API =====

export const InventoryApi = {
  async getLowStock(params: { limit?: number } = {}): Promise<LowStockResponse[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append("limit", params.limit.toString());

      const response = await fetch(
        `${BASE_URL}/inventory/low-stock?${queryParams.toString()}`,
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
        error instanceof Error ? error.message : "Failed to fetch low stock items"
      );
    }
  },
};

// ===== REPORTS API =====

export const ReportsApi = {
  async getClientsReport(): Promise<ClientsReportResponse[]> {
    try {
      const response = await fetch(`${BASE_URL}/reports/clients`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await handleResponse<ApiResponse<ClientsReportResponse[]>>(
        response
      );
      return data.data || [];
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch clients report"
      );
    }
  },

  async getRevenueReport(params: {
    startDate?: string;
    endDate?: string;
  } = {}): Promise<RevenueReportResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.startDate) queryParams.append("startDate", params.startDate);
      if (params.endDate) queryParams.append("endDate", params.endDate);

      const response = await fetch(
        `${BASE_URL}/reports/revenue?${queryParams.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await handleResponse<ApiResponse<RevenueReportResponse>>(
        response
      );
      return data.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch revenue report"
      );
    }
  },

  async getMasterUtilizationReport(): Promise<MasterUtilizationResponse[]> {
    try {
      const response = await fetch(`${BASE_URL}/reports/master-utilization`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await handleResponse<
        ApiResponse<MasterUtilizationResponse[]>
      >(response);
      return data.data || [];
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch master utilization report"
      );
    }
  },

  async getInventoryOutReport(): Promise<InventoryOutReportResponse[]> {
    try {
      const response = await fetch(`${BASE_URL}/reports/inventory-out`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await handleResponse<
        ApiResponse<InventoryOutReportResponse[]>
      >(response);
      return data.data || [];
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch inventory out report"
      );
    }
  },

  async getServicesRevenueReport(): Promise<ServicesRevenueReportResponse> {
    try {
      const response = await fetch(`${BASE_URL}/reports/services-revenue`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await handleResponse<
        ApiResponse<ServicesRevenueReportResponse>
      >(response);
      return data.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch services revenue report"
      );
    }
};  
// ===== SERVICES API =====

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
};
},
};
