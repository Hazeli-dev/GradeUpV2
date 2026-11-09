
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn } from "@/services/auth.service";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const getSafeRedirect = () => {
    const redirect = searchParams.get("redirect");

    return redirect &&
      redirect.startsWith("/") &&
      !redirect.startsWith("//")
      ? redirect
      : "/dashboard";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await signIn(email, password);

      if (res?.ok) {
        navigate(getSafeRedirect(), { replace: true });
      } else {
        setErrorMessage(res?.message || "Email atau kata sandi salah.");
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

  return (
    <div className="flex w-full flex-col space-y-6">
      <div className="flex flex-col space-y-2 text-left">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Selamat datang kembali
        </h1>
        <p className="text-sm text-muted-foreground">
          Masuk untuk melanjutkan belajar.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg bg-destructive/15 p-3 text-sm font-medium text-destructive">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex w-full flex-col space-y-4">
        <div className="flex flex-col space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              Kata sandi
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-emerald-500 hover:underline"
            >
              Lupa kata sandi?
            </Link>
          </div>

          <div className="relative flex items-center">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-muted-foreground hover:text-foreground"
              aria-label={
                showPassword
                  ? "Sembunyikan kata sandi"
                  : "Tampilkan kata sandi"
              }
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Masuk"
          )}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link
          to="/register"
          className="font-semibold text-emerald-500 hover:underline"
        >
          Daftar gratis
        </Link>
      </p>
    </div>
  );
}

export default LoginPage;
