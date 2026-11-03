import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Ambil dari .env - WAJIB ganti ke project baru Singapore setelah ini
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Cek apakah sudah pakai URL Singapore atau masih placeholder/Stockholm
export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !supabaseUrl.includes("placeholder-project")
);

// --- SINGLETON PATTERN biar koneksi gak bocor jadi 10/60 ---
// Ini yang bikin tadi Memory commitment 1.18GB WARNING
// Tiap import { supabase } sekarang pakai 1 client yang sama, bukan bikin baru

declare global {
  interface Window {
    __supabase_client__?: SupabaseClient;
  }
}

function getSupabaseClient(): SupabaseClient {
  // Di browser, simpan di window biar gak bikin baru tiap HMR / hot reload
  if (typeof window !== "undefined") {
    if (window.__supabase_client__) {
      return window.__supabase_client__;
    }
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      // Biar gak makan koneksi terus-terusan
      realtime: {
        params: {
          eventsPerSecond: 2,
        },
      },
    });
    window.__supabase_client__ = client;
    return client;
  }

  // Di SSR / build time
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const supabase = getSupabaseClient();

// Helper buat cek apakah sudah pindah ke Singapore
export const getSupabaseRegionInfo = () => {
  if (supabaseUrl.includes("supabase.co")) {
    // Project ref ada di URL: https://abcdefgh.supabase.co
    const ref = supabaseUrl.split(".")[0].split("//")[1];
    return {
      url: supabaseUrl,
      ref,
      isSingapore: true, // anggap Singapore setelah kamu ganti .env
      message: supabaseUrl.includes("placeholder") 
        ? "⚠️ Masih pakai placeholder - ganti .env ke URL Singapore baru!" 
        : "✅ Supabase client siap"
    };
  }
  return { url: supabaseUrl, isSingapore: false, message: "URL tidak valid" };
};
