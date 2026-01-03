import type { Client, Appointment, Master, Profile } from './types';

export const CLIENTS_STORAGE_KEY = 'tattoopro_clients';
export const APPOINTMENTS_STORAGE_KEY = 'tattoopro_appointments';
export const MASTERS_STORAGE_KEY = 'tattoopro_masters';
export const PROFILE_STORAGE_KEY = 'tattoopro_profile';

const isBrowser = () => typeof window !== 'undefined';

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// Clients
export function loadClients(): Client[] {
  if (!isBrowser()) return [];
  return safeParse<Client[]>(
    window.localStorage.getItem(CLIENTS_STORAGE_KEY),
    []
  );
}

export function saveClients(clients: Client[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
}

// Appointments
export function loadAppointments(): Appointment[] {
  if (!isBrowser()) return [];
  return safeParse<Appointment[]>(
    window.localStorage.getItem(APPOINTMENTS_STORAGE_KEY),
    []
  );
}

export function saveAppointments(appointments: Appointment[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    APPOINTMENTS_STORAGE_KEY,
    JSON.stringify(appointments)
  );
}

// Masters
export function loadMasters(): Master[] {
  if (!isBrowser()) return [];
  return safeParse<Master[]>(
    window.localStorage.getItem(MASTERS_STORAGE_KEY),
    []
  );
}

export function saveMasters(masters: Master[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(MASTERS_STORAGE_KEY, JSON.stringify(masters));
}

// Profile
export function loadProfile(defaultProfile: Profile): Profile {
  if (!isBrowser()) return defaultProfile;
  const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  return safeParse<Profile>(stored, defaultProfile);
}

export function saveProfile(profile: Profile): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export type UserRole = "admin" | "master";

export type Profile = {
  name: string;
  studioName: string;
  bio: string;
  phone: string;
  email: string;
  vk: string;
  telegram: string;
  instagram: string;
  currency: "RUB" | "USD" | "EUR";
  locale: "ru-RU" | "en-US";
  timeZone: string;
  role: UserRole;
};

