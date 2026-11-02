import { supabase } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "student";
}

// 1. Fungsi Login & Ambil Profil
export async function loginWithEmail(email: string, password: string) {
  // A. Lakukan autentikasi dengan Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    throw new Error(authError.message);
  }

  const user = authData.user;
  if (!user) throw new Error("Pengguna tidak ditemukan.");

  // B. Ambil data profil & role dari tabel public.profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    // Fallback jika profil belum ada di database
    return {
      user,
      profile: {
        id: user.id,
        email: user.email ?? "",
        full_name: user.user_metadata?.full_name ?? "User",
        role: "student" as const,
      },
    };
  }

  return {
    user,
    profile: profile as UserProfile,
  };
}

// 2. Fungsi Ambil Session & Profile Saat Ini (untuk Pengecekan Guard/Routing)
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (!profile) return null;
  return profile as UserProfile;
}

// 3. Fungsi Logout
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
