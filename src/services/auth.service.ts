
import { supabase } from "@/lib/supabase";

// ======================================================
// KONFIGURASI SUPABASE
// ======================================================

const isConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ======================================================
// TIPE AUTHENTICATION
// ======================================================

export interface AuthResult {
  ok: boolean;
  message: string;
  data?: any;
}

// ======================================================
// 1. MASUK DENGAN EMAIL DAN PASSWORD
// ======================================================

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  if (!isConfigured) {
    return {
      ok: true,
      message: "Berhasil masuk (mode demo)!",
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return {
      ok: true,
      message: "Berhasil masuk!",
      data,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || "Gagal masuk.",
    };
  }
}

// ======================================================
// 2. MASUK DAN DAFTAR DENGAN GOOGLE
// ======================================================

export async function signInWithGoogle(
  referralCode?: string
): Promise<AuthResult> {
  if (!isConfigured) {
    return {
      ok: false,
      message: "Supabase belum dikonfigurasi.",
    };
  }

  try {
    // Buat URL callback khusus GradeUp.
    const callbackUrl = new URL(
      "/auth/callback",
      window.location.origin
    );

    // Setelah OAuth berhasil, arahkan ke dashboard.
    callbackUrl.searchParams.set("next", "/dashboard");

    // Sertakan kode referral jika tersedia.
    const normalizedReferralCode = referralCode
      ?.trim()
      .toUpperCase();

    if (normalizedReferralCode) {
      callbackUrl.searchParams.set(
        "ref",
        normalizedReferralCode
      );
    }

    // LOG DIAGNOSTIK OAUTH
    console.info(
      "[GradeUp OAuth] Origin:",
      window.location.origin
    );

    console.info(
      "[GradeUp OAuth] Redirect URL:",
      callbackUrl.toString()
    );

    // Jalankan Google OAuth dengan callback khusus.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      console.error(
        "[GradeUp OAuth] Error:",
        error.message
      );

      return {
        ok: false,
        message: error.message,
      };
    }

    console.info(
      "[GradeUp OAuth] Permintaan berhasil dikirim."
    );

    return {
      ok: true,
      message: "Menghubungkan ke Google...",
      data,
    };
  } catch (err: any) {
    console.error(
      "[GradeUp OAuth] Exception:",
      err
    );

    return {
      ok: false,
      message:
        err?.message || "Gagal menghubungkan akun Google.",
    };
  }
}

// ======================================================
// 3. DAFTAR DENGAN EMAIL, PASSWORD, DAN REFERRAL
// ======================================================

export async function signUp(
  name: string,
  email: string,
  password: string,
  referralCode?: string
): Promise<AuthResult> {
  if (!isConfigured) {
    return {
      ok: true,
      message: "Pendaftaran berhasil (mode demo)!",
    };
  }

  try {
    const normalizedReferralCode = referralCode
      ?.trim()
      .toUpperCase();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
          ...(normalizedReferralCode
            ? {
                referral_code: normalizedReferralCode,
              }
            : {}),
        },
      },
    });

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return {
      ok: true,
      message:
        "Pendaftaran berhasil! Silakan cek email untuk verifikasi.",
      data,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || "Gagal mendaftar.",
    };
  }
}

// ======================================================
// 4. PERMINTAAN RESET KATA SANDI
// ======================================================

export async function requestPasswordReset(
  email: string
): Promise<AuthResult> {
  if (!isConfigured) {
    return {
      ok: true,
      message: "Tautan reset dikirim (mode demo).",
    };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return {
      ok: true,
      message:
        "Tautan pengaturan ulang kata sandi telah dikirim ke email Anda.",
    };
  } catch (err: any) {
    return {
      ok: false,
      message:
        err?.message || "Gagal mengirim permintaan reset.",
    };
  }
}

// ======================================================
// 5. PERBARUI KATA SANDI
// ======================================================

export async function resetPassword(
  password: string
): Promise<AuthResult> {
  if (!isConfigured) {
    return {
      ok: true,
      message: "Kata sandi diperbarui (mode demo).",
    };
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return {
      ok: true,
      message: "Kata sandi berhasil diperbarui.",
    };
  } catch (err: any) {
    return {
      ok: false,
      message:
        err?.message || "Gagal memperbarui kata sandi.",
    };
  }
}

// ======================================================
// 6. KIRIM ULANG EMAIL VERIFIKASI
// ======================================================

export async function resendVerification(
  email?: string
): Promise<AuthResult> {
  if (!isConfigured) {
    return {
      ok: true,
      message: "Email verifikasi terkirim (mode demo).",
    };
  }

  try {
    let targetEmail = email?.trim();

    if (!targetEmail) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      targetEmail = session?.user?.email;
    }

    if (!targetEmail) {
      return {
        ok: false,
        message:
          "Email tidak ditemukan. Silakan masukkan email Anda.",
      };
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: targetEmail,
    });

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return {
      ok: true,
      message: "Email verifikasi berhasil dikirim ulang.",
    };
  } catch (err: any) {
    return {
      ok: false,
      message:
        err?.message || "Gagal mengirim ulang email verifikasi.",
    };
  }
}

// ======================================================
// DEFAULT EXPORT
// ======================================================

const authService = {
  signIn,
  signInWithGoogle,
  signUp,
  requestPasswordReset,
  resetPassword,
  resendVerification,
};

export default authService;
