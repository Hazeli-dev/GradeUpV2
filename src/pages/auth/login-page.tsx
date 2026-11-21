import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, GraduationCap, Loader2, Lock, Mail } from "lucide-react";
import { signIn } from "@/services/auth.service";

/* ------------------------------------------------------------------ */
/* Token gaya (disamakan dengan HomePage)                              */
/* ------------------------------------------------------------------ */

const headingText = "text-slate-950 dark:text-white";

const mutedText = "text-slate-600 dark:text-slate-300";

const inputBase =
  "w-full rounded-xl border border-slate-200 bg-white/80 py-3 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 hover:border-teal-300 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:placeholder:text-slate-500 dark:hover:border-teal-700 dark:focus:border-emerald-400 dark:focus:bg-slate-900 dark:focus:ring-emerald-400/20";

const linkText =
  "font-semibold text-teal-700 transition-colors duration-300 hover:text-teal-800 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ======================================================
  // REDIRECT SETELAH LOGIN
  // ======================================================

  const getSafeRedirect = () => {
    const redirect = searchParams.get("redirect");

    if (
      redirect &&
      redirect.startsWith("/") &&
      !redirect.startsWith("//") &&
      !redirect.startsWith("/auth/")
    ) {
      return redirect;
    }

    return "/dashboard";
  };

  // ======================================================
  // PROSES LOGIN EMAIL DAN PASSWORD
  // ======================================================

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await signIn(email.trim(), password);

      if (res?.ok) {
        navigate(getSafeRedirect(), { replace: true });
      } else {
        setErrorMessage(
          res?.message || "Email atau kata sandi salah."
        );
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan yang tidak terduga."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ======================================================
  // TAMPILAN LOGIN
  // ======================================================

  return (
    <div className="relative isolate flex w-full flex-col space-y-6 overflow-hidden rounded-3xl border border-white/80 bg-white/75 p-6 shadow-[0_30px_80px_-40px_rgba(6,78,59,0.45)] ring-1 ring-inset ring-white/60 backdrop-blur-xl transition-colors duration-300 dark:border-emerald-900/40 dark:bg-slate-900/70 dark:shadow-[0_30px_80px_-40px_rgba(16,185,129,0.25)] dark:ring-white/5 sm:p-8">
      {/* DEKORASI BACKGROUND (tidak interaktif) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-emerald-400/30 blur-3xl dark:bg-emerald-500/15" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-teal-300/35 blur-3xl dark:bg-teal-600/15" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(5,150,105,0.2)_1px,transparent_1.5px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_80%_55%_at_50%_0%,#000_20%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_80%_55%_at_50%_0%,#000_20%,transparent_100%)] dark:bg-[radial-gradient(rgba(110,231,183,0.16)_1px,transparent_1.5px)]" />
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent dark:via-emerald-500/40" />
        <div className="absolute -right-10 top-10 h-32 w-32 rounded-full border border-emerald-400/40 dark:border-emerald-400/10" />
      </div>

      <div className="flex flex-col space-y-4 text-left">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-700/25 dark:bg-emerald-400 dark:text-[#123b29] dark:shadow-emerald-500/20">
          <GraduationCap className="h-6 w-6" />
        </div>

        <div className="flex flex-col space-y-2">
          <h1
            className={`text-3xl font-black tracking-[-0.04em] ${headingText}`}
          >
            Selamat datang kembali
          </h1>

          <p className={`text-sm leading-7 ${mutedText}`}>
            Masuk untuk melanjutkan belajar.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
        >
          {errorMessage}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col space-y-4"
      >
        {/* EMAIL */}

        <div className="flex flex-col space-y-1.5">
          <label
            htmlFor="email"
            className="text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Email
          </label>

          <div className="relative flex items-center">
            <Mail
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400 dark:text-slate-500"
            />

            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className={`${inputBase} pl-10 pr-3.5`}
            />
          </div>
        </div>

        {/* PASSWORD */}

        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Kata sandi
            </label>

            <Link to="/forgot-password" className={`text-xs ${linkText}`}>
              Lupa kata sandi?
            </Link>
          </div>

          <div className="relative flex items-center">
            <Lock
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400 dark:text-slate-500"
            />

            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className={`${inputBase} pl-10 pr-11`}
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors duration-300 hover:bg-emerald-50 hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-300"
              aria-label={
                showPassword
                  ? "Sembunyikan kata sandi"
                  : "Tampilkan kata sandi"
              }
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>
        </div>

        {/* TOMBOL LOGIN */}

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-teal-700 text-sm font-bold text-white shadow-lg shadow-teal-700/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:bg-emerald-500 dark:text-slate-950 dark:shadow-emerald-500/10 dark:hover:bg-emerald-400 dark:focus-visible:ring-offset-slate-900"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Memproses...
            </>
          ) : (
            "Masuk"
          )}
        </button>
      </form>

      {/* LINK REGISTER */}

      <div className="border-t border-slate-200/80 pt-5 dark:border-slate-700/70">
        <p className={`text-center text-sm ${mutedText}`}>
          Belum punya akun?{" "}
          <Link to="/register" className={linkText}>
            Daftar gratis
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
