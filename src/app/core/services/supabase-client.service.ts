import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export function getSupabaseClient(): SupabaseClient {
  return createClient(environment.supabaseUrl, environment.supabaseKey);
}
