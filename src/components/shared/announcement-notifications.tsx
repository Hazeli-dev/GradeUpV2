import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Announcement = {
  id: string;
  title: string;
  content: string;
  category: string;
  published_at: string | null;
  created_at: string;
};

export function AnnouncementNotifications() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const unreadCount = useMemo(
    () => announcements.filter((item) => !readIds.includes(item.id)).length,
    [announcements, readIds]
  );

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setAnnouncements([]);
        setReadIds([]);
        return;
      }

      const [announcementResult, readResult] = await Promise.all([
        supabase
          .from("announcements")
          .select("id, title, content, category, published_at, created_at")
          .eq("status", "Published")
          .not("published_at", "is", null)
          .lte("published_at", new Date().toISOString())
          .order("published_at", { ascending: false }),

        supabase
          .from("announcement_reads")
          .select("announcement_id")
          .eq("user_id", user.id),
      ]);

      if (announcementResult.error) throw announcementResult.error;
      if (readResult.error) throw readResult.error;

      setAnnouncements((announcementResult.data ?? []) as Announcement[]);
      setReadIds(
        (readResult.data ?? []).map((item) => item.announcement_id)
      );
    } catch (error) {
      console.error("Gagal memuat pengumuman:", error);
      toast.error("Pengumuman gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  const markAsRead = async (announcementId: string) => {
    if (readIds.includes(announcementId)) return;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) return;

      const { error } = await supabase
        .from("announcement_reads")
        .upsert(
          {
            announcement_id: announcementId,
            user_id: user.id,
          },
          {
            onConflict: "announcement_id,user_id",
            ignoreDuplicates: true,
          }
        );

      if (error) throw error;

      setReadIds((previous) =>
        previous.includes(announcementId)
          ? previous
          : [...previous, announcementId]
      );
    } catch (error) {
      console.error("Gagal menyimpan status baca:", error);
      toast.error("Status pengumuman gagal diperbarui.");
    }
  };

  const openAnnouncement = (announcement: Announcement) => {
    setSelected(announcement);
    void markAsRead(announcement.id);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    });
  };

  return (
    <>
      <DropdownMenu
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (value) void loadAnnouncements();
        }}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Notifikasi pengumuman"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Bell className="h-[18px] w-[18px]" />

            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-background">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="max-h-[min(480px,75vh)] w-[350px] max-w-[calc(100vw-2rem)] overflow-y-auto p-0"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-sm font-bold">Notifikasi</p>
              <p className="text-xs text-muted-foreground">
                Pengumuman dari GradeUp
              </p>
            </div>

            {unreadCount > 0 && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {unreadCount} belum dibaca
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              <p className="text-xs text-muted-foreground">
                Memuat pengumuman...
              </p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <Bell className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-semibold">Belum ada pengumuman</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pengumuman admin akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="p-2">
              {announcements.map((announcement) => {
                const isRead = readIds.includes(announcement.id);

                return (
                  <DropdownMenuItem
                    key={announcement.id}
                    onSelect={() => openAnnouncement(announcement)}
                    className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3"
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <Megaphone className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`line-clamp-2 text-sm ${
                            isRead
                              ? "font-medium text-muted-foreground"
                              : "font-bold text-foreground"
                          }`}
                        >
                          {announcement.title}
                        </p>

                        {!isRead && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                        )}
                      </div>

                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {announcement.content}
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {announcement.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(announcement.published_at)}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}

          <DropdownMenuSeparator />

          <div className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
            <CheckCheck className="h-3.5 w-3.5" />
            Pengumuman resmi dari admin GradeUp
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={!!selected}
        onOpenChange={(value) => {
          if (!value) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <Megaphone className="h-5 w-5" />
                  </span>

                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    {selected.category}
                  </span>
                </div>

                <DialogTitle className="text-left text-xl">
                  {selected.title}
                </DialogTitle>

                <DialogDescription className="flex items-center gap-1.5 text-left">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(selected.published_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
                {selected.content}
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCheck className="h-4 w-4 shrink-0" />
                Pengumuman telah ditandai sebagai sudah dibaca.
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
