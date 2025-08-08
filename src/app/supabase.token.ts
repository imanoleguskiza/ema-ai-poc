import { InjectionToken } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('SUPABASE_CLIENT');


