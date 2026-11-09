
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/login", { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />

      <div className="text-center">
        <h1 className="font-bold">
          Mengalihkan ke Halaman Login
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Silakan masuk menggunakan email dan kata sandi Anda.
        </p>
      </div>
    </div>
  );
}
