import { isSupabaseConfigured } from "@/lib/supabase";

/** Mengembalikan true jika variabel lingkungan Supabase sudah diisi. */
export const isLoadedSupabase = () => isSupabaseConfigured;
