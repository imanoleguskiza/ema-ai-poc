// src/app/core/supabase.client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

let client: SupabaseClient | null = null;

export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (!client) {
    const mod = await import('@supabase/supabase-js');
    client = mod.createClient(environment.supabaseUrl, environment.supabaseKey);
  }
  return client;
}
