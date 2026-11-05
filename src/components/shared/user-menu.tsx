import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/utils/format";

export function UserMenu({
  name,
  email,
  settingsTo,
}: {
  name: string;
  email: string;
  settingsTo: string;
}) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success("Berhasil keluar dari akun.");
      navigate("/login", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan.";

      toast.error("Gagal keluar: " + message);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="h-9 w-9">
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>

        <span className="hidden text-left leading-tight md:block">
          <span className="block text-sm font-bold">{name}</span>
          <span className="block text-xs text-muted-foreground">
            {email}
          </span>
        </span>

        <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Akun Saya</DropdownMenuLabel>

        <DropdownMenuItem asChild>
          <Link to={settingsTo}>
            <User />
            Profil
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to={settingsTo}>
            <Settings />
            Pengaturan
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          destructive
          onSelect={(event) => {
            event.preventDefault();
            void handleLogout();
          }}
        >
          <LogOut />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
