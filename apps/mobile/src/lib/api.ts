import Constants from 'expo-constants';
import { Platform } from 'react-native';

const SERVER_PORT = 8787;

/**
 * Where the Subtivio server runs. In development it is the same machine as the
 * Expo dev server, so the phone reaches it on the laptop's LAN address with no
 * setup. EXPO_PUBLIC_API_URL overrides this (e.g. for a hosted server).
 */
function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${SERVER_PORT}`;
  }
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${devHost ?? 'localhost'}:${SERVER_PORT}`;
}

export const apiUrl = resolveApiUrl();

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${apiUrl}${path}`, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export type ServerHealth = { ok: boolean; transcription: string; transliteration: string };

/** Resolves with server info, or undefined when no server answers within 3 s. */
export async function checkServer(): Promise<ServerHealth | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    return await api<ServerHealth>('/health', { signal: controller.signal });
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
