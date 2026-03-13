import { supabase } from './storage.ts';

export const db = supabase;
export const auth = supabase ? (supabase as any).auth : null;

export default supabase;