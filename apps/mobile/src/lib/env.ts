import { z } from 'zod';

/**
 * Public runtime config. Expo inlines `EXPO_PUBLIC_*` variables at build time,
 * so only non-secret values belong here. Secrets (ASR keys, LLM keys, R2
 * credentials) live on the worker, never in the app bundle.
 */
const EnvSchema = z.object({
  supabaseUrl: z.url().optional(),
  supabaseAnonKey: z.string().min(1).optional(),
});

export const env = EnvSchema.parse({
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || undefined,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || undefined,
});

/** Without Supabase config the app runs in demo mode against local sample data. */
export const isDemoMode = !env.supabaseUrl || !env.supabaseAnonKey;
