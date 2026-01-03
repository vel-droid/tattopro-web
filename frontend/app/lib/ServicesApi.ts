// app/lib/ServicesApi.ts
import { Service, ServiceCategory } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string | null;
};

export type CreateServiceInput = {
  name: string;
  category: ServiceCategory;
  basePrice: number | null;
  defaultDurationMinutes: number | null;
  isActive: boolean;
  notes: string | null;
};

export type UpdateServiceInput = Partial<CreateServiceInput> & {
  id: number;
};

async function handleResponse<T>(res: Response): Promise<T> {
  const json: ApiResponse<T> = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Request failed");
  }
  return json.data;
}

export const ServicesApi = {
  async getAll(): Promise<Service[]> {
    const res = await fetch(`${BASE_URL}/api/services`, {
      cache: "no-store",
    });
    return handleResponse<Service[]>(res);
  },

  async create(payload: CreateServiceInput): Promise<Service> {
    const res = await fetch(`${BASE_URL}/api/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<Service>(res);
  },

  async update(payload: UpdateServiceInput): Promise<Service> {
    const { id, ...data } = payload;
    const res = await fetch(`${BASE_URL}/api/services/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Service>(res);
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/services/${id}`, {
      method: "DELETE",
    });
    await handleResponse<null>(res);
  },
};
