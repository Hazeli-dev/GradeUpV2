
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  MessageCircle,
  X,
  Send,
  Headphones,
  Loader2,
  Trash2,
  Bot,
  User,
  ChevronRight,
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  Crown,
  Smartphone,
  CircleHelp,
  CheckCircle2,
  MessageSquareText,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Conversation = {
  id: string;
  status: "waiting" | "in_progress" | "resolved";
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_type: "student" | "admin" | "system";
  content: string;
  created_at: string;
  read_at?: string | null;
};

type FAQ = {
  id: string;
  question: string;
  keywords: string[] | null;
  answer: string;
  priority: number;
  is_active: boolean;
};

type FAQCategory = {
  id: string;
  title: string;
  description: string;
  icon: typeof CircleHelp;
  matches: (value: string) => boolean;
};

const NOTIFICATION_POLL_INTERVAL = 30_000;
const MESSAGE_POLL_INTERVAL = 10_000;
const STATUS_POLL_INTERVAL = 20_000;

const FAQ_CATEGORIES: FAQCategory[] = [
  {
    id: "account",
    title: "Akun dan Login",
    description: "Login, kata sandi, dan profil akun",
    icon: User,
    matches: (value) =>
      /login|kata sandi|password|profil akun|data akun|mengubah profil|ubah profil|edit profil|ganti nama|masuk akun/i.test(
        value
      ),
  },
  {
    id: "courses",
    title: "Kursus dan Materi",
    description: "Materi pembelajaran dan progres belajar",
    icon: BookOpen,
    matches: (value) =>
      /materi|pembelajaran|kursus|melanjutkan pembelajaran|lanjut belajar|progres belajar|riwayat belajar/i.test(
        value
      ),
  },
  {
    id: "exams",
    title: "Ujian dan Hasil Belajar",
    description: "Kendala ujian, nilai, dan hasil ujian",
    icon: ClipboardCheck,
    matches: (value) =>
      /ujian|hasil belajar|hasil ujian|nilai|skor|soal tidak muncul|tes/i.test(
        value
      ),
  },
  {
    id: "premium",
    title: "GradeUp Premium",
    description: "Langganan, pembayaran, dan akses Premium",
    icon: Crown,
    matches: (value) =>
      /premium|pembayaran|langganan|transaksi|kursus terkunci/i.test(
        value
      ),
  },
  {
    id: "device",
    title: "Penggunaan GradeUp",
    description: "Akses GradeUp melalui HP dan perangkat lain",
    icon: Smartphone,
    matches: (value) =>
      /\bhp\b|ponsel|handphone|mobile|perangkat|akses lewat hp/i.test(
        value
      ),
  },
];

// Mencegah pembaruan state jika data pesan sebenarnya tidak berubah.
function areMessagesEqual(
  previous: ChatMessage[],
  next: ChatMessage[]
) {
  if (previous.length !== next.length) return false;

  return previous.every((message, index) => {
    const nextMessage = next[index];

    return (
      message.id === nextMessage.id &&
      message.content === nextMessage.content &&
      message.sender_type === nextMessage.sender_type &&
      message.created_at === nextMessage.created_at &&
      message.read_at === nextMessage.read_at
    );
  });
}

export function GradeUpChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(
    null
  );
  const [handledFaqMessages, setHandledFaqMessages] = useState<
    string[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqLoadError, setFaqLoadError] = useState<string | null>(
    null
  );
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  // Mencegah query yang sama berjalan bertumpuk.
  const unreadLoadingRef = useRef(false);
  const messagesLoadingRef = useRef(false);
  const statusLoadingRef = useRef(false);

  // Mengambil identitas pengguna.
  const loadUser = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;

    setUserId(user?.id ?? null);

    return user;
  }, []);

  // Mengambil jumlah notifikasi yang belum dibaca.
  const loadUnreadCount = useCallback(async () => {
    if (unreadLoadingRef.current) return;

    unreadLoadingRef.current = true;

    try {
      const { data, error } = await supabase.rpc(
        "get_gradeup_chat_unread_count"
      );

      if (error) throw error;

      const nextCount = Number(data ?? 0);

      setUnreadCount((current) =>
        current === nextCount ? current : nextCount
      );
    } catch (error) {
      console.error("Gagal mengambil notifikasi chat:", error);
    } finally {
      unreadLoadingRef.current = false;
    }
  }, []);

  // Menandai balasan admin sebagai sudah dibaca.
  const markChatAsRead = useCallback(
    async (conversationId: string) => {
      try {
        const { error } = await supabase.rpc(
          "mark_gradeup_chat_as_read",
          {
            p_conversation_id: conversationId,
          }
        );

        if (error) throw error;

        const readAt = new Date().toISOString();

        // Perbarui status baca secara lokal agar tidak terus
        // memanggil RPC pada setiap polling.
        setMessages((current) =>
          current.map((message) =>
            message.conversation_id === conversationId &&
            message.sender_type === "admin" &&
            !message.read_at
              ? { ...message, read_at: readAt }
              : message
          )
        );

        await loadUnreadCount();
      } catch (error) {
        console.error(
          "Gagal menandai chat sudah dibaca:",
          error
        );
      }
    },
    [loadUnreadCount]
  );

  // Mengambil FAQ aktif.
  const loadFAQs = useCallback(async () => {
    try {
      setFaqLoading(true);
      setFaqLoadError(null);

      const { data, error } = await supabase
        .from("chat_faqs")
        .select(
          "id, question, keywords, answer, priority, is_active"
        )
        .eq("is_active", true)
        .order("priority", { ascending: false });

      if (error) throw error;

      const activeFAQs = (data ?? []) as FAQ[];

      setFaqs(activeFAQs);

      if (activeFAQs.length === 0) {
        setFaqLoadError(
          "Belum ada FAQ aktif yang dapat ditampilkan."
        );
      }
    } catch (error) {
      console.error("Gagal memuat FAQ:", error);

      setFaqs([]);

      setFaqLoadError(
        error instanceof Error
          ? error.message
          : "Daftar FAQ gagal dimuat. Silakan coba lagi."
      );
    } finally {
      setFaqLoading(false);
    }
  }, []);

  // Mengambil percakapan terakhir milik siswa.
  const loadConversation = useCallback(async () => {
    try {
      setLoading(true);

      const user = await loadUser();

      if (!user) {
        setConversation(null);
        setMessages([]);
        return;
      }

      const { data, error } = await supabase
        .from("chat_conversations")
        .select("id, status")
        .eq("student_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setConversation(null);
        setMessages([]);
        return;
      }

      setConversation((current) =>
        current?.id === data.id &&
        current.status === data.status
          ? current
          : (data as Conversation)
      );
    } catch (error) {
      console.error("Gagal memuat percakapan:", error);
      toast.error("Gagal memuat percakapan chat.");
    } finally {
      setLoading(false);
    }
  }, [loadUser]);

  // Memperbarui status percakapan dari admin.
  const refreshConversationStatus = useCallback(async () => {
    if (!conversation?.id || statusLoadingRef.current) return;

    statusLoadingRef.current = true;

    try {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("id, status")
        .eq("id", conversation.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setConversation(null);
        setMessages([]);
        setActiveCategory(null);
        setHandledFaqMessages([]);
        return;
      }

      setConversation((current) =>
        current?.id === data.id &&
        current.status === data.status
          ? current
          : (data as Conversation)
      );
    } catch (error) {
      console.error(
        "Gagal memperbarui status percakapan:",
        error
      );
    } finally {
      statusLoadingRef.current = false;
    }
  }, [conversation?.id]);

  // Mengambil pesan dalam percakapan.
  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (messagesLoadingRef.current) return;

      messagesLoadingRef.current = true;

      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select(
            "id, conversation_id, sender_id, sender_type, content, created_at, read_at"
          )
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        const loadedMessages = (data ?? []) as ChatMessage[];

        setMessages((current) =>
          areMessagesEqual(current, loadedMessages)
            ? current
            : loadedMessages
        );

        const hasUnreadAdminMessage = loadedMessages.some(
          (message) =>
            message.sender_type === "admin" &&
            !message.read_at
        );

        if (isOpen && hasUnreadAdminMessage) {
          await markChatAsRead(conversationId);
        }
      } catch (error) {
        console.error("Gagal memuat pesan:", error);
      } finally {
        messagesLoadingRef.current = false;
      }
    },
    [isOpen, markChatAsRead]
  );

  // Inisialisasi notifikasi.
  useEffect(() => {
    let cancelled = false;

    const initializeNotifications = async () => {
      try {
        const user = await loadUser();

        if (user && !cancelled) {
          await loadUnreadCount();
        }
      } catch (error) {
        console.error(
          "Gagal menginisialisasi notifikasi:",
          error
        );
      }
    };

    void initializeNotifications();

    return () => {
      cancelled = true;
    };
  }, [loadUser, loadUnreadCount]);

  // Polling notifikasi: setiap 30 detik.
  // Dihentikan sementara ketika tab tidak aktif.
  useEffect(() => {
    if (!userId) return;

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void loadUnreadCount();
      }
    };

    const interval = window.setInterval(
      refreshIfVisible,
      NOTIFICATION_POLL_INTERVAL
    );

    document.addEventListener(
      "visibilitychange",
      refreshIfVisible
    );

    return () => {
      window.clearInterval(interval);
      document.removeEventListener(
        "visibilitychange",
        refreshIfVisible
      );
    };
  }, [userId, loadUnreadCount]);

  // Memuat FAQ dan percakapan ketika popup dibuka.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const initializeChat = async () => {
      try {
        const user = await loadUser();

        if (cancelled) return;

        if (!user) {
          setFaqs([]);
          setFaqLoadError(
            "Silakan login untuk menggunakan bantuan GradeUp."
          );
          return;
        }

        await Promise.all([
          loadFAQs(),
          loadConversation(),
        ]);
      } catch (error) {
        console.error("Gagal menginisialisasi chat:", error);

        if (!cancelled) {
          setFaqLoadError(
            "Gagal memuat bantuan GradeUp. Silakan coba lagi."
          );
        }
      }
    };

    void initializeChat();

    return () => {
      cancelled = true;
    };
  }, [isOpen, loadUser, loadFAQs, loadConversation]);

  // Memuat pesan hanya ketika popup terbuka.
  useEffect(() => {
    if (!isOpen || !conversation?.id) return;

    void loadMessages(conversation.id);
  }, [isOpen, conversation?.id, loadMessages]);

  // Polling pesan: setiap 10 detik.
  useEffect(() => {
    if (!isOpen || !conversation?.id) return;

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void loadMessages(conversation.id);
      }
    };

    const interval = window.setInterval(
      refreshIfVisible,
      MESSAGE_POLL_INTERVAL
    );

    document.addEventListener(
      "visibilitychange",
      refreshIfVisible
    );

    return () => {
      window.clearInterval(interval);
      document.removeEventListener(
        "visibilitychange",
        refreshIfVisible
      );
    };
  }, [isOpen, conversation?.id, loadMessages]);

  // Polling status: setiap 20 detik.
  useEffect(() => {
    if (!isOpen || !conversation?.id) return;

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshConversationStatus();
      }
    };

    const interval = window.setInterval(
      refreshIfVisible,
      STATUS_POLL_INTERVAL
    );

    document.addEventListener(
      "visibilitychange",
      refreshIfVisible
    );

    return () => {
      window.clearInterval(interval);
      document.removeEventListener(
        "visibilitychange",
        refreshIfVisible
      );
    };
  }, [
    isOpen,
    conversation?.id,
    refreshConversationStatus,
  ]);

  // Scroll hanya jika siswa sedang berada di bagian bawah.
  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length]);

  // Membuat percakapan baru jika belum tersedia.
  const getOrCreateConversation = async () => {
    if (conversation) return conversation;

    const user = await loadUser();

    if (!user) {
      throw new Error("Silakan login terlebih dahulu.");
    }

    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({
        student_id: user.id,
        subject: "Bantuan GradeUp",
        status: "waiting",
      })
      .select("id, status")
      .single();

    if (error) throw error;

    const newConversation = data as Conversation;

    setConversation(newConversation);
    shouldAutoScrollRef.current = true;

    return newConversation;
  };

  // Fungsi utama pengiriman pesan.
  const sendMessage = async (content: string) => {
    const trimmedContent = content.trim();

    if (!trimmedContent || sending) return;

    if (trimmedContent.length > 2000) {
      toast.error("Pesan maksimal 2.000 karakter.");
      return;
    }

    try {
      setSending(true);

      const user = await loadUser();

      if (!user) {
        throw new Error("Silakan login kembali.");
      }

      const activeConversation = await getOrCreateConversation();

      const { error } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: activeConversation.id,
          sender_id: user.id,
          sender_type: "student",
          content: trimmedContent,
        });

      if (error) throw error;

      setMessageInput("");
      setActiveCategory(null);
      shouldAutoScrollRef.current = true;

      await Promise.all([
        loadMessages(activeConversation.id),
        loadUnreadCount(),
      ]);

      // Status akan diperbarui melalui polling berikutnya.
    } catch (error) {
      console.error("Gagal mengirim pesan:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Pesan gagal dikirim. Silakan coba lagi."
      );
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    await sendMessage(messageInput);
  };

  const handleSelectFAQ = async (faq: FAQ) => {
    await sendMessage(faq.question);
  };

  const handleAskAdmin = async (messageId: string) => {
    const confirmed = window.confirm(
      "Apakah kamu masih membutuhkan bantuan admin? Pesan akan diteruskan ke antrean admin."
    );

    if (!confirmed) return;

    await sendMessage(
      "Saya masih membutuhkan bantuan admin terkait pertanyaan sebelumnya. Mohon bantu periksa masalah saya."
    );

    setHandledFaqMessages((previous) =>
      previous.includes(messageId)
        ? previous
        : [...previous, messageId]
    );
  };

  const handleFaqResolved = (messageId: string) => {
    setHandledFaqMessages((previous) =>
      previous.includes(messageId)
        ? previous
        : [...previous, messageId]
    );

    toast.success(
      "Terima kasih! Semoga jawaban GradeUp membantu."
    );
  };

  // Menghapus percakapan beserta seluruh pesannya.
  const handleCloseConversation = async () => {
    if (!conversation || closing) return;

    const confirmed = window.confirm(
      "Yakin ingin menghapus seluruh percakapan ini secara permanen? Semua pesan akan ikut terhapus dan tidak dapat dipulihkan."
    );

    if (!confirmed) return;

    try {
      setClosing(true);

      const { data, error } = await supabase.rpc(
        "close_gradeup_chat",
        {
          p_conversation_id: conversation.id,
        }
      );

      if (error) throw error;

      if (!data) {
        throw new Error("Percakapan gagal dihapus.");
      }

      setConversation(null);
      setMessages([]);
      setMessageInput("");
      setActiveCategory(null);
      setHandledFaqMessages([]);
      shouldAutoScrollRef.current = true;

      await loadUnreadCount();

      toast.success("Percakapan berhasil dihapus.");
    } catch (error) {
      console.error("Gagal menghapus percakapan:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal menghapus percakapan."
      );
    } finally {
      setClosing(false);
    }
  };

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    });

  const selectedCategory = FAQ_CATEGORIES.find(
    (category) => category.id === activeCategory
  );

  const categoryFAQs = selectedCategory
    ? faqs.filter((faq) => {
        const searchableText = [
          faq.question,
          ...(faq.keywords ?? []),
        ].join(" ");

        return selectedCategory.matches(searchableText);
      })
    : [];

  const isFAQAnswer = (content: string) =>
    faqs.some(
      (faq) => faq.answer.trim() === content.trim()
    );

  return (
    <>
      {/* TOMBOL CHAT MENGAMBANG */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={
            unreadCount > 0
              ? `Buka bantuan GradeUp, ${unreadCount} balasan belum dibaca`
              : "Buka bantuan GradeUp"
          }
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-900/20 transition-all hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/30 sm:bottom-7 sm:right-7"
        >
          <MessageCircle className="h-6 w-6" />

          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-background bg-red-600 px-1 text-[11px] font-bold text-white shadow-md">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : (
            <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-300" />
          )}
        </button>
      )}

      {/* POPUP CHAT */}
      {isOpen && (
        <section
          aria-label="Bantuan chat GradeUp"
          className="fixed bottom-4 right-3 z-50 flex h-[min(680px,calc(100dvh-2rem))] w-[calc(100vw-1.5rem)] max-w-[390px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:bottom-7 sm:right-7 sm:h-[640px]"
        >
          {/* HEADER */}
          <header className="flex shrink-0 items-center justify-between bg-gradient-to-r from-emerald-700 to-teal-600 px-4 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                <Headphones className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-sm font-bold">
                  Bantuan GradeUp
                </h2>

                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-emerald-50">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Asisten dan tim bantuan GradeUp
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Tutup popup chat"
              className="rounded-lg p-2 transition-colors hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {/* STATUS PERCAKAPAN */}
          {conversation && (
            <div className="shrink-0 border-b bg-muted/40 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {conversation.status === "in_progress"
                    ? "Sedang ditangani admin"
                    : conversation.status === "resolved"
                      ? "Masalah ditandai selesai"
                      : "Menunggu balasan admin"}
                </span>

                <button
                  type="button"
                  onClick={handleCloseConversation}
                  disabled={closing}
                  className="flex items-center gap-1.5 text-xs font-medium text-destructive transition-colors hover:opacity-75 disabled:opacity-50"
                >
                  {closing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Hapus chat
                </button>
              </div>

              {conversation.status === "resolved" && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        Masalah ditandai selesai!
                      </p>

                      <p className="mt-1 text-xs leading-relaxed text-emerald-700 dark:text-emerald-400">
                        Admin GradeUp telah menandai masalah ini
                        sebagai selesai. Jika bantuan sudah cukup,
                        kamu dapat menghapus seluruh riwayat
                        percakapan.
                      </p>

                      <button
                        type="button"
                        onClick={handleCloseConversation}
                        disabled={closing}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {closing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Hapus riwayat percakapan
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AREA PESAN */}
          <div
            ref={messagesContainerRef}
            onScroll={(event) => {
              const element = event.currentTarget;

              const distanceFromBottom =
                element.scrollHeight -
                element.scrollTop -
                element.clientHeight;

              shouldAutoScrollRef.current =
                distanceFromBottom < 100;
            }}
            className="flex-1 space-y-4 overflow-y-auto bg-muted/20 px-3 py-4 sm:px-4"
          >
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            ) : (
              <>
                {/* PESAN PEMBUKA */}
                <div className="flex items-start gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <Bot className="h-4 w-4" />
                  </div>

                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm border bg-card px-3 py-2.5 shadow-sm">
                    <p className="text-sm leading-relaxed">
                      Halo! Selamat datang di bantuan GradeUp.
                      Ada yang bisa kami bantu? Silakan pilih
                      kategori di bawah atau tuliskan pertanyaanmu.
                    </p>

                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Asisten GradeUp
                    </p>
                  </div>
                </div>

                {/* MENU KATEGORI FAQ */}
                {(!messages.length || activeCategory === null) && (
                  <div className="space-y-2 pl-10">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Pilih kategori bantuan
                    </p>

                    {FAQ_CATEGORIES.map((category) => {
                      const Icon = category.icon;

                      return (
                        <button
                          key={category.id}
                          type="button"
                          disabled={sending}
                          onClick={() =>
                            setActiveCategory(category.id)
                          }
                          className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-sm transition-colors hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            <Icon className="h-4 w-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">
                              {category.title}
                            </p>

                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {category.description}
                            </p>
                          </div>

                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() =>
                        void sendMessage(
                          "Saya ingin berbicara dengan admin GradeUp."
                        )
                      }
                      disabled={sending}
                      className="flex w-full items-center gap-3 rounded-xl border border-dashed border-emerald-500/50 bg-emerald-50/50 p-3 text-left transition-colors hover:bg-emerald-100/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                        <Headphones className="h-4 w-4" />
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                          Hubungi Admin
                        </p>

                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Saya ingin bantuan langsung dari admin
                        </p>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                )}

                {/* DAFTAR PERTANYAAN DALAM KATEGORI */}
                {activeCategory && (
                  <div className="ml-10 space-y-2 rounded-xl border bg-card p-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveCategory(null)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                        aria-label="Kembali ke kategori"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>

                      <div className="flex-1">
                        <p className="text-sm font-bold">
                          {selectedCategory?.title}
                        </p>

                        <p className="text-[10px] text-muted-foreground">
                          Pilih pertanyaan yang sesuai
                        </p>
                      </div>
                    </div>

                    {faqLoading ? (
                      <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                        Memuat pertanyaan FAQ...
                      </div>
                    ) : faqLoadError ? (
                      <div className="space-y-3 rounded-lg bg-muted/50 p-3">
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {faqLoadError}
                        </p>

                        <button
                          type="button"
                          onClick={() => void loadFAQs()}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border bg-background p-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Coba muat ulang FAQ
                        </button>
                      </div>
                    ) : categoryFAQs.length > 0 ? (
                      categoryFAQs.map((faq) => (
                        <button
                          key={faq.id}
                          type="button"
                          onClick={() => void handleSelectFAQ(faq)}
                          disabled={sending}
                          className="flex w-full items-center gap-2 rounded-lg border bg-background p-3 text-left text-xs leading-relaxed transition-colors hover:border-emerald-500/50 hover:bg-emerald-50/50 disabled:opacity-50 dark:hover:bg-emerald-950/20"
                        >
                          <MessageSquareText className="h-4 w-4 shrink-0 text-emerald-600" />

                          <span className="flex-1">
                            {faq.question}
                          </span>

                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                      ))
                    ) : (
                      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                        Belum ada FAQ aktif dalam kategori ini.
                        Kamu tetap dapat mengirim pertanyaan kepada admin.
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const categoryName =
                          selectedCategory?.title ?? "ini";

                        setActiveCategory(null);

                        void sendMessage(
                          `Saya membutuhkan bantuan admin untuk kategori ${categoryName}.`
                        );
                      }}
                      disabled={sending}
                      className="w-full rounded-lg border border-dashed border-emerald-500/50 p-2.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                    >
                      Pertanyaan saya tidak ada di daftar
                    </button>
                  </div>
                )}

                {/* RIWAYAT PESAN */}
                {messages.map((message) => {
                  const isStudent =
                    message.sender_type === "student";

                  const isSystem =
                    message.sender_type === "system";

                  const isFaq =
                    isSystem && isFAQAnswer(message.content);

                  const showFaqActions =
                    isFaq &&
                    !handledFaqMessages.includes(message.id);

                  return (
                    <div key={message.id} className="space-y-2">
                      <div
                        className={cn(
                          "flex items-start gap-2",
                          isStudent && "justify-end"
                        )}
                      >
                        {!isStudent && (
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                              isSystem
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            )}
                          >
                            {isSystem ? (
                              <Bot className="h-4 w-4" />
                            ) : (
                              <Headphones className="h-4 w-4" />
                            )}
                          </div>
                        )}

                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-3 py-2.5 shadow-sm",
                            isStudent
                              ? "rounded-tr-sm bg-emerald-600 text-white"
                              : "rounded-tl-sm border bg-card text-card-foreground"
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {message.content}
                          </p>

                          <p
                            className={cn(
                              "mt-1 text-right text-[10px]",
                              isStudent
                                ? "text-emerald-100"
                                : "text-muted-foreground"
                            )}
                          >
                            {isStudent
                              ? "Kamu"
                              : isSystem
                                ? "Asisten GradeUp"
                                : "Admin"}{" "}
                            · {formatTime(message.created_at)}
                          </p>
                        </div>

                        {isStudent && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      {showFaqActions && (
                        <div className="ml-10 max-w-[85%] rounded-xl border bg-card p-3">
                          <p className="mb-2 text-xs font-semibold">
                            Apakah jawaban ini membantu?
                          </p>

                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleFaqResolved(message.id)
                              }
                              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Jawaban membantu
                            </button>

                            <button
                              type="button"
                              disabled={sending}
                              onClick={() =>
                                void handleAskAdmin(message.id)
                              }
                              className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs font-semibold transition-colors hover:bg-muted disabled:opacity-50"
                            >
                              <Headphones className="h-4 w-4" />
                              Masih butuh bantuan admin
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* KEMBALI KE PILIHAN FAQ */}
          {messages.length > 0 && activeCategory !== null && (
            <div className="shrink-0 border-t bg-card px-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
              >
                <CircleHelp className="h-4 w-4" />
                Kembali ke pilihan FAQ
              </button>
            </div>
          )}

          {/* INPUT PESAN */}
          <form
            onSubmit={handleSendMessage}
            className="flex shrink-0 items-end gap-2 border-t bg-card p-3"
          >
            <textarea
              value={messageInput}
              onChange={(event) =>
                setMessageInput(event.target.value)
              }
              placeholder="Tulis pertanyaan kamu..."
              rows={1}
              maxLength={2000}
              disabled={sending || loading || !userId}
              className="max-h-24 min-h-11 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 disabled:opacity-50"
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />

            <button
              type="submit"
              disabled={
                !messageInput.trim() ||
                sending ||
                loading ||
                !userId
              }
              aria-label="Kirim pesan"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>

          <div className="shrink-0 bg-card pb-2 text-center">
            <p className="text-[10px] text-muted-foreground">
              GradeUp · Layanan Bantuan Pengguna
            </p>
          </div>
        </section>
      )}
    </>
  );
}
