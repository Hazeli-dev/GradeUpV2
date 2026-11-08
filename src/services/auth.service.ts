
import { supabase } from "@/lib/supabase";

// Cek konfigurasi Supabase
const isConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface AuthResult {
  ok: boolean;
  message: string;
  data?: any;
}

// 1. Fungsi Masuk dengan Email dan Password
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  if (!isConfigured) {
    return { ok: true, message: "Berhasil masuk (mode demo)!" };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "Berhasil masuk!", data };
  } catch (err: any) {
    return { ok: false, message: err?.message || "Gagal masuk." };
  }
}

// 2. Fungsi Masuk dan Daftar dengan Google
export async function signInWithGoogle(): Promise<AuthResult> {
  if (!isConfigured) {
    return {
      ok: false,
      message: "Supabase belum dikonfigurasi.",
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return {
      ok: true,
      message: "Menghubungkan ke Google...",
      data,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || "Gagal menghubungkan akun Google.",
    };
  }
}

// 3. Fungsi Daftar dengan Email dan Password
export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  if (!isConfigured) {
    return { ok: true, message: "Pendaftaran berhasil (mode demo)!" };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return {
      ok: true,
      message: "Pendaftaran berhasil! Silakan cek email untuk verifikasi.",
      data,
    };
  } catch (err: any) {
    return { ok: false, message: err?.message || "Gagal mendaftar." };
  }
}

// 4. Permintaan Reset Kata Sandi
export async function requestPasswordReset(
  email: string
): Promise<AuthResult> {
  if (!isConfigured) {
    return { ok: true, message: "Tautan reset dikirim (mode demo)." };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return {
      ok: true,
      message: "Tautan pengaturan ulang kata sandi telah dikirim ke email Anda.",
    };
  } catch (err: any) {
    return { ok: false, message: err?.message || "Gagal mengirim permintaan reset." };
  }
}

// 5. Perbarui Kata Sandi Baru
export async function resetPassword(password: string): Promise<AuthResult> {
  if (!isConfigured) {
    return { ok: true, message: "Kata sandi diperbarui (mode demo)." };
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: "Kata sandi berhasil diperbarui." };
  } catch (err: any) {
    return { ok: false, message: err?.message || "Gagal memperbarui kata sandi." };
  }
}

// 6. Kirim Ulang Email Verifikasi
export async function resendVerification(
  email?: string
): Promise<AuthResult> {
  if (!isConfigured) {
    return { ok: true, message: "Email verifikasi terkirim (mode demo)." };
  }

  try {
    let targetEmail = email;

    if (!targetEmail) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      targetEmail = session?.user?.email;
    }

    if (!targetEmail) {
      return {
        ok: false,
        message: "Email tidak ditemukan. Silakan masukkan email Anda.",
      };
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: targetEmail,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return {
      ok: true,
      message: "Email verifikasi berhasil dikirim ulang.",
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || "Gagal mengirim ulang email verifikasi.",
    };
  }
}

// Default export
const authService = {
  signIn,
  signInWithGoogle,
  signUp,
  requestPasswordReset,
  resetPassword,
  resendVerification,
};

export default authService;
