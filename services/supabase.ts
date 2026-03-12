import { supabase } from './storage.ts';

export const db = supabase;
export const auth = supabase.auth;

export default supabase;