
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
// URL REDIRECT AUTHENTICATION
// ======================================================

function getAuthRedirectUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

// ======================================================
// VALIDASI KONFIGURASI
// ======================================================

function checkConfiguration(): AuthResult | null {
  if (!isConfigured) {
    return {
      ok: false,
      message:
        "Layanan autentikasi belum dikonfigurasi. Silakan hubungi administrator.",
    };
  }

  return null;
}

// ======================================================
// 1. MASUK DENGAN EMAIL DAN PASSWORD
// ======================================================

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const configurationError = checkConfiguration();

  if (configurationError) return configurationError;

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: normalizedEmail,
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
  } catch (err: unknown) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat masuk.",
    };
  }
}

// ======================================================
// 2. DAFTAR DENGAN EMAIL, PASSWORD, DAN REFERRAL
// ======================================================

export async function signUp(
  name: string,
  email: string,
  password: string,
  referralCode?: string
): Promise<AuthResult> {
  const configurationError = checkConfiguration();

  if (configurationError) return configurationError;

  try {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const normalizedReferralCode = referralCode
      ?.trim()
      .toUpperCase();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,

      options: {
        // Redirect setelah pengguna mengklik email verifikasi
        emailRedirectTo: getAuthRedirectUrl("/verify-email"),

        // Metadata profil dan referral
        data: {
          full_name: normalizedName,

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
        "Pendaftaran berhasil! Silakan periksa email untuk verifikasi akun.",
      data,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mendaftar.",
    };
  }
}

// ======================================================
// 3. PERMINTAAN RESET KATA SANDI
// ======================================================

export async function requestPasswordReset(
  email: string
): Promise<AuthResult> {
  const configurationError = checkConfiguration();

  if (configurationError) return configurationError;

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: getAuthRedirectUrl("/reset-password"),
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
  } catch (err: unknown) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : "Gagal mengirim permintaan reset kata sandi.",
    };
  }
}

// ======================================================
// 4. PERBARUI KATA SANDI
// ======================================================

export async function resetPassword(
  password: string
): Promise<AuthResult> {
  const configurationError = checkConfiguration();

  if (configurationError) return configurationError;

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
  } catch (err: unknown) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : "Gagal memperbarui kata sandi.",
    };
  }
}

// ======================================================
// 5. KIRIM ULANG EMAIL VERIFIKASI
// ======================================================

export async function resendVerification(
  email?: string
): Promise<AuthResult> {
  const configurationError = checkConfiguration();

  if (configurationError) return configurationError;

  try {
    let targetEmail = email?.trim().toLowerCase();

    // Ambil email dari session jika tidak diberikan
    if (!targetEmail) {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        return {
          ok: false,
          message: sessionError.message,
        };
      }

      targetEmail = session?.user?.email?.toLowerCase();
    }

    if (!targetEmail) {
      return {
        ok: false,
        message:
          "Email tidak ditemukan. Silakan masukkan alamat email Anda.",
      };
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: targetEmail,

      options: {
        emailRedirectTo: getAuthRedirectUrl("/verify-email"),
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
        "Email verifikasi berhasil dikirim ulang. Silakan periksa kotak masuk Anda.",
    };
  } catch (err: unknown) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : "Gagal mengirim ulang email verifikasi.",
    };
  }
}

// ======================================================
// DEFAULT EXPORT
// ======================================================

const authService = {
  signIn,
  signUp,
  requestPasswordReset,
  resetPassword,
  resendVerification,
};

export default authService;
