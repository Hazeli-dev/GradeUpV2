import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  MessageCircle,
  Search,
  Send,
  RefreshCw,
  User,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  Pencil,
  X,
  MessageSquare,
  BookOpen,
  Loader2,
  Inbox,
  Mail,
  Phone,
  Copy,
  GraduationCap,
  School,
  IdCard,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type ChatStatus = "waiting" | "in_progress" | "resolved";
type SenderType = "student" | "admin" | "system";

type Conversation = {
  id: string;
  student_id: string;
  subject: string | null;
  status: ChatStatus;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_type: SenderType;
  content: string;
  created_at: string;
};

type StudentProfile = {
  id: string;
  email: string | null;
  name: string | null;
  full_name: string | null;
  phone: string | null;
  school: string | null;
  class: string | null;
  grade: number | null;
  education_level: string | null;
  avatar_url: string | null;
};

type FAQ = {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const STATUS_OPTIONS: {
  value: ChatStatus;
  label: string;
}[] = [
  { value: "waiting", label: "Menunggu" },
  { value: "in_progress", label: "Sedang Ditangani" },
  { value: "resolved", label: "Selesai" },
];

const statusStyle: Record<ChatStatus, string> = {
  waiting:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  in_progress:
    "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  resolved:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

const formatDate = (value: string | null) => {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
};

const shortId = (value: string) => `${value.slice(0, 8)}…`;

const getStudentName = (profile?: StudentProfile) => {
  return (
    profile?.full_name?.trim() ||
    profile?.name?.trim() ||
    profile?.email?.trim() ||
    "Siswa GradeUp"
  );
};

const getStudentInitial = (profile?: StudentProfile) => {
  const name = getStudentName(profile);
  return name.charAt(0).toUpperCase();
};

/* ------------------------------------------------------------------ */
/* Dekorasi visual (murni tampilan, tidak interaktif)                  */
/* ------------------------------------------------------------------ */

const patternLine =
  "[--gu-line:rgba(15,118,110,0.10)] dark:[--gu-line:rgba(52,211,153,0.09)]";

const panelSurface =
  "border border-emerald-200/70 bg-card/90 shadow-[0_16px_44px_-28px_rgba(15,118,110,0.4)] backdrop-blur-sm dark:border-emerald-900/40";

const fieldFocus =
  "focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

function ChatStyles() {
  return (
    <style>{`
      @keyframes gu-drift {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(22px, -16px, 0) scale(1.07); }
      }
      @keyframes gu-drift-rev {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(-20px, 14px, 0) scale(1.06); }
      }
      @keyframes gu-reveal {
        from { opacity: 0; transform: translate3d(0, 12px, 0); }
        to { opacity: 1; transform: translate3d(0, 0, 0); }
      }
      .gu-drift { animation: gu-drift 20s ease-in-out infinite; }
      .gu-drift-rev { animation: gu-drift-rev 24s ease-in-out infinite; }
      .gu-reveal { animation: gu-reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }

      .gu-grid {
        background-image:
          linear-gradient(to right, var(--gu-line) 1px, transparent 1px),
          linear-gradient(to bottom, var(--gu-line) 1px, transparent 1px);
        background-size: 40px 40px;
        -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 0%, #000 20%, transparent 100%);
        mask-image: radial-gradient(ellipse 80% 70% at 50% 0%, #000 20%, transparent 100%);
      }
      .gu-chat-bg {
        background-image: radial-gradient(var(--gu-dot) 1px, transparent 1.3px);
        background-size: 22px 22px;
      }

      @media (prefers-reduced-motion: reduce) {
        .gu-drift, .gu-drift-rev, .gu-reveal {
          animation: none !important;
        }
      }
    `}</style>
  );
}

function DecorLayer({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {children}
    </div>
  );
}

export default function ChatManagementPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<
    Record<string, StudentProfile>
  >({});

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"inbox" | "faq">("inbox");

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [faqLoading, setFaqLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ChatStatus>(
    "all"
  );
  const [reply, setReply] = useState("");

  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqKeywords, setFaqKeywords] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [faqPriority, setFaqPriority] = useState("0");
  const [faqSaving, setFaqSaving] = useState(false);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const selectedStudent = useMemo(
    () =>
      selectedConversation
        ? studentProfiles[selectedConversation.student_id]
        : undefined,
    [selectedConversation, studentProfiles]
  );

  const waitingCount = useMemo(
    () => conversations.filter((item) => item.status === "waiting").length,
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return conversations.filter((item) => {
      const profile = studentProfiles[item.student_id];

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      const searchableText = [
        item.subject,
        item.student_id,
        item.last_message_preview,
        profile?.full_name,
        profile?.name,
        profile?.email,
        profile?.phone,
        profile?.school,
        profile?.class,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !keyword || searchableText.includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [conversations, search, statusFilter, studentProfiles]);

  // MEMUAT PERCAKAPAN DAN IDENTITAS SISWA
  const loadConversations = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select(
          "id, student_id, subject, status, last_message_at, last_message_preview, created_at, updated_at"
        )
        .order("last_message_at", {
          ascending: false,
          nullsFirst: false,
        });

      if (error) throw error;

      const rows = (data ?? []) as Conversation[];
      setConversations(rows);

      setSelectedId((current) => {
        if (current && rows.some((item) => item.id === current)) {
          return current;
        }

        return null;
      });

      // Ambil profil hanya untuk siswa yang memiliki percakapan.
      const studentIds = [
        ...new Set(rows.map((item) => item.student_id)),
      ];

      if (studentIds.length === 0) {
        setStudentProfiles({});
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, email, name, full_name, phone, school, class, grade, education_level, avatar_url"
        )
        .in("id", studentIds);

      if (profileError) {
        console.error(
          "Gagal memuat identitas siswa:",
          profileError
        );
        return;
      }

      const profileMap: Record<string, StudentProfile> = {};

      (profileData ?? []).forEach((profile) => {
        const item = profile as StudentProfile;
        profileMap[item.id] = item;
      });

      setStudentProfiles(profileMap);
    } catch (error) {
      console.error("Gagal memuat percakapan:", error);
      toast.error("Gagal memuat daftar percakapan.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // MEMUAT PESAN
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(
          "id, conversation_id, sender_id, sender_type, content, created_at"
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages((data ?? []) as ChatMessage[]);
    } catch (error) {
      console.error("Gagal memuat pesan:", error);
      toast.error("Gagal memuat pesan percakapan.");
    }
  }, []);

  // MEMUAT FAQ
  const loadFaqs = useCallback(async () => {
    setFaqLoading(true);

    try {
      const { data, error } = await supabase
        .from("chat_faqs")
        .select(
          "id, question, keywords, answer, priority, is_active, created_at, updated_at"
        )
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setFaqs((data ?? []) as FAQ[]);
    } catch (error) {
      console.error("Gagal memuat FAQ:", error);
      toast.error("Gagal memuat data FAQ.");
    } finally {
      setFaqLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations(true);
    void loadFaqs();
  }, [loadConversations, loadFaqs]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    let active = true;

    const fetchMessages = async () => {
      if (!active) return;
      await loadMessages(selectedId);
    };

    void fetchMessages();

    const interval = window.setInterval(() => {
      if (
        active &&
        document.visibilityState === "visible"
      ) {
        void fetchMessages();
      }
    }, 4000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [selectedId, loadMessages]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadConversations(false);
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadConversations]);

  // SALIN KE CLIPBOARD
  const copyToClipboard = async (
    value: string | null | undefined,
    label: string
  ) => {
    if (!value) {
      toast.error(`${label} tidak tersedia.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} berhasil disalin.`);
    } catch {
      toast.error(`Gagal menyalin ${label.toLowerCase()}.`);
    }
  };

  // KIRIM BALASAN ADMIN
  const sendReply = async () => {
    const content = reply.trim();

    if (!content || !selectedConversation || sending) return;

    setSending(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Sesi admin tidak ditemukan.");

      const { error: insertError } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          sender_type: "admin",
          content,
        });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from("chat_conversations")
        .update({ status: "in_progress" })
        .eq("id", selectedConversation.id);

      if (updateError) throw updateError;

      setReply("");

      await Promise.all([
        loadMessages(selectedConversation.id),
        loadConversations(false),
      ]);

      toast.success("Balasan berhasil dikirim.");
    } catch (error) {
      console.error("Gagal mengirim balasan:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal mengirim balasan."
      );
    } finally {
      setSending(false);
    }
  };

  // UBAH STATUS
  const updateStatus = async (status: ChatStatus) => {
    if (!selectedConversation) return;

    try {
      const { error } = await supabase
        .from("chat_conversations")
        .update({ status })
        .eq("id", selectedConversation.id);

      if (error) throw error;

      await loadConversations(false);
      toast.success("Status percakapan diperbarui.");
    } catch (error) {
      console.error("Gagal memperbarui status:", error);
      toast.error("Gagal memperbarui status percakapan.");
    }
  };

  // HAPUS PERCAKAPAN PERMANEN
  const deleteConversation = async () => {
    if (!selectedConversation) return;

    const confirmed = window.confirm(
      "Hapus percakapan ini secara permanen? Seluruh riwayat pesan siswa dan admin akan ikut dihapus dan tidak dapat dipulihkan."
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase.rpc("close_gradeup_chat", {
        p_conversation_id: selectedConversation.id,
      });

      if (error) throw error;

      setSelectedId(null);
      setMessages([]);

      await loadConversations(false);

      toast.success(
        "Percakapan dan seluruh riwayatnya telah dihapus."
      );
    } catch (error) {
      console.error("Gagal menghapus percakapan:", error);
      toast.error(
        "Percakapan gagal dihapus. Silakan coba lagi."
      );
    }
  };

  // FAQ BARU
  const openNewFaq = () => {
    setEditingFaq(null);
    setFaqQuestion("");
    setFaqKeywords("");
    setFaqAnswer("");
    setFaqPriority("0");
    setFaqDialogOpen(true);
  };

  // EDIT FAQ
  const openEditFaq = (faq: FAQ) => {
    setEditingFaq(faq);
    setFaqQuestion(faq.question);
    setFaqKeywords(faq.keywords.join(", "));
    setFaqAnswer(faq.answer);
    setFaqPriority(String(faq.priority));
    setFaqDialogOpen(true);
  };

  // SIMPAN FAQ
  const saveFaq = async () => {
    const question = faqQuestion.trim();
    const answer = faqAnswer.trim();

    const keywords = faqKeywords
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    if (!question || !answer || keywords.length === 0) {
      toast.error(
        "Lengkapi pertanyaan, kata kunci, dan jawaban FAQ."
      );
      return;
    }

    setFaqSaving(true);

    try {
      const payload = {
        question,
        keywords,
        answer,
        priority: Number(faqPriority) || 0,
      };

      const result = editingFaq
        ? await supabase
            .from("chat_faqs")
            .update(payload)
            .eq("id", editingFaq.id)
        : await supabase.from("chat_faqs").insert({
            ...payload,
            is_active: true,
          });

      if (result.error) throw result.error;

      setFaqDialogOpen(false);
      await loadFaqs();

      toast.success(
        editingFaq ? "FAQ diperbarui." : "FAQ ditambahkan."
      );
    } catch (error) {
      console.error("Gagal menyimpan FAQ:", error);
      toast.error("FAQ gagal disimpan.");
    } finally {
      setFaqSaving(false);
    }
  };

  // AKTIF / NONAKTIF FAQ
  const toggleFaq = async (faq: FAQ) => {
    try {
      const { error } = await supabase
        .from("chat_faqs")
        .update({ is_active: !faq.is_active })
        .eq("id", faq.id);

      if (error) throw error;

      await loadFaqs();

      toast.success(
        faq.is_active
          ? "FAQ dinonaktifkan."
          : "FAQ diaktifkan."
      );
    } catch (error) {
      console.error("Gagal mengubah status FAQ:", error);
      toast.error("Status FAQ gagal diperbarui.");
    }
  };

  return (
    <div className="relative isolate space-y-6">
      <ChatStyles />

      <DecorLayer>
        <div className={`gu-grid absolute inset-0 ${patternLine}`} />
        <div className="gu-drift absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-600/10" />
        <div className="gu-drift-rev absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-teal-300/25 blur-3xl dark:bg-teal-600/10" />
      </DecorLayer>

      {/* HEADER */}
      <div className="gu-reveal relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-100/80 via-white/70 to-teal-100/70 p-5 shadow-[0_20px_50px_-30px_rgba(15,118,110,0.45)] backdrop-blur-sm dark:border-emerald-900/40 dark:from-emerald-950/60 dark:via-slate-900/60 dark:to-teal-950/50 sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-400/30 blur-3xl dark:bg-emerald-500/15" />
          <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/10" />
          <div className="absolute -right-10 top-6 h-40 w-40 rounded-full border border-emerald-400/30 dark:border-emerald-400/10" />
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent dark:via-emerald-500/30" />
        </div>

        <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-700/25">
              <MessageCircle className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Helpdesk GradeUp
              </h1>
              <p className="text-sm text-muted-foreground">
                Kelola pertanyaan dan bantuan untuk siswa.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadConversations(true);
              void loadFaqs();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200/80 bg-background/70 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:border-emerald-400/60 hover:bg-background dark:border-emerald-900/50"
          >
            <RefreshCw className="h-4 w-4" />
            Muat Ulang
          </button>
        </div>
      </div>

      {/* RINGKASAN */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${panelSurface}`}>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/10"
          />
          <div className="relative flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Total Percakapan
            </p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
            </span>
          </div>
          <p className="relative mt-2 text-2xl font-bold">
            {conversations.length}
          </p>
        </div>

        <div className={`group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${panelSurface}`}>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl dark:bg-amber-500/10"
          />
          <div className="relative flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Menunggu Balasan
            </p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </span>
          </div>
          <p className="relative mt-2 text-2xl font-bold">
            {waitingCount}
          </p>
        </div>

        <div className={`group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${panelSurface}`}>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-500/10"
          />
          <div className="relative flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              FAQ Aktif
            </p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950">
              <BookOpen className="h-5 w-5 text-blue-500" />
            </span>
          </div>
          <p className="relative mt-2 text-2xl font-bold">
            {faqs.filter((faq) => faq.is_active).length}
          </p>
        </div>
      </div>

      {/* TAB */}
      <div className="flex gap-2 border-b border-emerald-200/70 dark:border-emerald-900/40">
        <button
          type="button"
          onClick={() => setActiveTab("inbox")}
          className={cn(
            "rounded-t-xl border-b-2 px-4 py-3 text-sm font-semibold transition",
            activeTab === "inbox"
              ? "border-emerald-600 bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-transparent text-muted-foreground hover:bg-emerald-50/40 hover:text-foreground dark:hover:bg-emerald-950/20"
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Kotak Masuk
            {waitingCount > 0 && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {waitingCount}
              </span>
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("faq")}
          className={cn(
            "rounded-t-xl border-b-2 px-4 py-3 text-sm font-semibold transition",
            activeTab === "faq"
              ? "border-emerald-600 bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-transparent text-muted-foreground hover:bg-emerald-50/40 hover:text-foreground dark:hover:bg-emerald-950/20"
          )}
        >
          <span className="inline-flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Manajemen FAQ
          </span>
        </button>
      </div>

      {/* KOTAK MASUK */}
      {activeTab === "inbox" && (
        <div className={`grid min-h-[650px] overflow-hidden rounded-2xl lg:grid-cols-[340px_minmax(0,1fr)] ${panelSurface}`}>
          <section className="flex min-h-[300px] flex-col border-b border-emerald-100 bg-gradient-to-b from-emerald-50/50 to-transparent dark:border-emerald-900/30 dark:from-emerald-950/20 lg:border-b-0 lg:border-r">
            <div className="space-y-3 border-b border-emerald-100 p-4 dark:border-emerald-900/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama, email, HP, atau pesan..."
                  className={`h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none ${fieldFocus}`}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "all" | ChatStatus
                  )
                }
                className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="all">Semua Status</option>
                <option value="waiting">Menunggu</option>
                <option value="in_progress">Sedang Ditangani</option>
                <option value="resolved">Selesai</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center px-5 py-12 text-center">
                  <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950">
                    <Inbox className="h-7 w-7 text-emerald-600" />
                  </span>
                  <p className="text-sm font-semibold">
                    Belum ada percakapan
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Chat dari siswa akan muncul di sini.
                  </p>
                </div>
              ) : (
                filteredConversations.map((conversation) => {
                  const active = selectedId === conversation.id;
                  const profile =
                    studentProfiles[conversation.student_id];

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedId(conversation.id)}
                      className={cn(
                        "relative w-full border-b border-emerald-100/80 p-4 text-left transition hover:bg-emerald-50/70 dark:border-emerald-900/25 dark:hover:bg-emerald-950/25",
                        active &&
                          "bg-emerald-50 shadow-[inset_3px_0_0_0_rgb(5,150,105)] dark:bg-emerald-950/40"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={getStudentName(profile)}
                            className="h-10 w-10 shrink-0 rounded-full border-2 border-white object-cover shadow-sm dark:border-slate-800"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 font-bold text-white shadow-sm">
                            {getStudentInitial(profile)}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-bold">
                              {getStudentName(profile)}
                            </p>

                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {formatDate(conversation.last_message_at)}
                            </span>
                          </div>

                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {profile?.email ||
                              `ID: ${shortId(conversation.student_id)}`}
                          </p>

                          <p className="mt-2 truncate text-xs font-medium text-foreground">
                            {conversation.subject ||
                              "Percakapan bantuan"}
                          </p>

                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {conversation.last_message_preview ||
                              "Belum ada pesan"}
                          </p>

                          <span
                            className={cn(
                              "mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold",
                              statusStyle[conversation.status]
                            )}
                          >
                            {STATUS_OPTIONS.find(
                              (item) =>
                                item.value === conversation.status
                            )?.label ?? conversation.status}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* DETAIL CHAT */}
          <section className="flex min-h-[500px] min-w-0 flex-col">
            {!selectedConversation ? (
              <div className="gu-chat-bg flex flex-1 flex-col items-center justify-center px-6 py-16 text-center [--gu-dot:rgba(5,150,105,0.14)] dark:[--gu-dot:rgba(110,231,183,0.08)]">
                <div className="relative">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-6 rounded-full bg-emerald-400/25 blur-2xl dark:bg-emerald-500/10"
                  />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-700/25">
                    <MessageCircle className="h-8 w-8" />
                  </div>
                </div>

                <h2 className="mt-5 text-lg font-bold">
                  Pilih Percakapan
                </h2>

                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Pilih chat dari kotak masuk untuk membaca pesan,
                  melihat identitas siswa, dan memberikan bantuan.
                </p>
              </div>
            ) : (
              <>
                {/* HEADER DETAIL */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-card/80 p-4 backdrop-blur dark:border-emerald-900/30">
                  <div className="flex min-w-0 items-center gap-3">
                    {selectedStudent?.avatar_url ? (
                      <img
                        src={selectedStudent.avatar_url}
                        alt={getStudentName(selectedStudent)}
                        className="h-11 w-11 shrink-0 rounded-full border-2 border-white object-cover shadow-sm dark:border-slate-800"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 font-bold text-white shadow-sm">
                        {getStudentInitial(selectedStudent)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {getStudentName(selectedStudent)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {selectedStudent?.email ||
                          "Email belum tersedia"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedConversation.status}
                      onChange={(event) =>
                        void updateStatus(
                          event.target.value as ChatStatus
                        )
                      }
                      className="h-9 rounded-lg border bg-background px-2 text-xs font-semibold outline-none focus:border-emerald-500"
                    >
                      {STATUS_OPTIONS.map((item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => void deleteConversation()}
                      title="Hapus percakapan permanen"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* KARTU IDENTITAS SISWA */}
                <div className="relative overflow-hidden border-b border-emerald-100 bg-gradient-to-br from-emerald-50/80 via-transparent to-teal-50/60 p-4 dark:border-emerald-900/30 dark:from-emerald-950/30 dark:to-teal-950/20">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-600/10"
                  />

                  <div className="relative mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
                        <IdCard className="h-4 w-4 text-emerald-600" />
                      </span>
                      <h3 className="text-xs font-bold uppercase tracking-wide">
                        Identitas Siswa
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void copyToClipboard(
                          selectedStudent?.email,
                          "Email"
                        )
                      }
                      disabled={!selectedStudent?.email}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-card px-2.5 py-1.5 text-[11px] font-semibold transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-900/50 dark:hover:bg-emerald-950/40"
                    >
                      <Copy className="h-3 w-3" />
                      Salin Email
                    </button>
                  </div>

                  <div className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <User className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600/70" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">
                          Nama Lengkap
                        </p>
                        <p className="break-words text-xs font-semibold">
                          {selectedStudent?.full_name ||
                            selectedStudent?.name ||
                            "Belum diisi"}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-start gap-2">
                      <User className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600/70" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">
                          Nama Akun
                        </p>
                        <p className="break-words text-xs font-semibold">
                          {selectedStudent?.name || "Belum diisi"}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-start gap-2">
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600/70" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">
                          Email
                        </p>
                        <p className="break-all text-xs font-semibold">
                          {selectedStudent?.email || "Belum tersedia"}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-start gap-2">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600/70" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">
                          Nomor HP
                        </p>
                        <p className="break-words text-xs font-semibold">
                          {selectedStudent?.phone || "Belum diisi"}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-start gap-2">
                      <School className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600/70" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">
                          Sekolah
                        </p>
                        <p className="break-words text-xs font-semibold">
                          {selectedStudent?.school || "Belum diisi"}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-start gap-2">
                      <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600/70" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">
                          Jenjang / Kelas
                        </p>
                        <p className="break-words text-xs font-semibold">
                          {[
                            selectedStudent?.education_level,
                            selectedStudent?.grade
                              ? `Kelas ${selectedStudent.grade}`
                              : selectedStudent?.class,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Belum diisi"}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-start gap-2 sm:col-span-2 xl:col-span-3">
                      <IdCard className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600/70" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">
                          ID Akun
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-all text-xs font-medium">
                            {selectedConversation.student_id}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              void copyToClipboard(
                                selectedConversation.student_id,
                                "ID akun"
                              )
                            }
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                          >
                            <Copy className="h-3 w-3" />
                            Salin ID
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!selectedStudent && (
                    <p className="relative mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      Data profil belum berhasil dimuat. ID akun tetap
                      tersedia untuk identifikasi.
                    </p>
                  )}
                </div>

                {/* RIWAYAT PESAN */}
                <div className="gu-chat-bg flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-emerald-50/50 to-teal-50/30 p-4 [--gu-dot:rgba(5,150,105,0.14)] dark:from-emerald-950/20 dark:to-slate-900/20 dark:[--gu-dot:rgba(110,231,183,0.08)]">
                  {messagesLoading && messages.length === 0 ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      Belum ada pesan dalam percakapan ini.
                    </p>
                  ) : (
                    messages.map((message) => {
                      const isAdmin =
                        message.sender_type === "admin";
                      const isSystem =
                        message.sender_type === "system";

                      if (isSystem) {
                        return (
                          <div
                            key={message.id}
                            className="mx-auto max-w-[90%] rounded-xl border border-dashed border-emerald-300/70 bg-background/90 px-4 py-3 text-center backdrop-blur-sm dark:border-emerald-800/60"
                          >
                            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                              Balasan Otomatis GradeUp
                            </p>

                            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                              {message.content}
                            </p>

                            <p className="mt-2 text-[10px] text-muted-foreground">
                              {formatDate(message.created_at)}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex",
                            isAdmin
                              ? "justify-end"
                              : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%]",
                              isAdmin
                                ? "rounded-br-md bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/20"
                                : "rounded-bl-md border border-emerald-200/70 bg-card text-foreground shadow-sm dark:border-emerald-900/40"
                            )}
                          >
                            <p
                              className={cn(
                                "mb-1 text-[10px] font-bold",
                                isAdmin
                                  ? "text-emerald-100"
                                  : "text-muted-foreground"
                              )}
                            >
                              {isAdmin
                                ? "Admin GradeUp"
                                : getStudentName(selectedStudent)}
                            </p>

                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                              {message.content}
                            </p>

                            <p
                              className={cn(
                                "mt-2 flex items-center justify-end gap-1 text-[10px]",
                                isAdmin
                                  ? "text-emerald-100"
                                  : "text-muted-foreground"
                              )}
                            >
                              <Clock3 className="h-3 w-3" />
                              {formatDate(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* FORM BALASAN */}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendReply();
                  }}
                  className="border-t border-emerald-100 bg-card/90 p-3 backdrop-blur dark:border-emerald-900/30 sm:p-4"
                >
                  {selectedConversation.status === "resolved" && (
                    <p className="mb-2 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      Percakapan berstatus selesai. Mengirim balasan
                      akan mengubah status menjadi Sedang Ditangani.
                    </p>
                  )}

                  <div className="flex items-end gap-2">
                    <textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          void sendReply();
                        }
                      }}
                      rows={2}
                      placeholder="Tulis balasan untuk siswa..."
                      className={`min-h-[48px] flex-1 resize-y rounded-xl border bg-background px-3 py-3 text-sm outline-none transition ${fieldFocus}`}
                    />

                    <button
                      type="submit"
                      disabled={!reply.trim() || sending}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-700/25 transition hover:from-emerald-600 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Kirim balasan"
                    >
                      {sending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Enter untuk mengirim · Shift + Enter untuk baris baru
                  </p>
                </form>
              </>
            )}
          </section>
        </div>
      )}

      {/* MANAJEMEN FAQ */}
      {activeTab === "faq" && (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold">
                Daftar FAQ Otomatis
              </h2>
              <p className="text-sm text-muted-foreground">
                Jawaban ini digunakan sistem ketika pesan siswa cocok
                dengan kata kunci FAQ.
              </p>
            </div>

            <button
              type="button"
              onClick={openNewFaq}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-700/25 transition hover:from-emerald-600 hover:to-teal-700"
            >
              <Plus className="h-4 w-4" />
              Tambah FAQ
            </button>
          </div>

          {faqLoading ? (
            <div className={`flex justify-center rounded-2xl py-12 ${panelSurface}`}>
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : faqs.length === 0 ? (
            <div className={`rounded-2xl px-6 py-12 text-center ${panelSurface}`}>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950">
                <BookOpen className="h-7 w-7 text-emerald-600" />
              </span>
              <p className="mt-3 font-semibold">
                Belum ada data FAQ
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tambahkan FAQ agar sistem dapat menjawab pertanyaan umum.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {faqs.map((faq) => (
                <article
                  key={faq.id}
                  className={`group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/60 hover:shadow-[0_24px_50px_-28px_rgba(15,118,110,0.5)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5 ${panelSurface}`}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-14 -right-14 h-40 w-40 rounded-full bg-emerald-400/0 blur-3xl transition-colors duration-500 group-hover:bg-emerald-400/20 dark:group-hover:bg-emerald-500/10"
                  />

                  <div className="relative flex flex-col justify-between gap-3 sm:flex-row">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">
                          {faq.question}
                        </h3>

                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[10px] font-bold",
                            faq.is_active
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {faq.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {faq.answer}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {faq.keywords.map((keyword, index) => (
                          <span
                            key={`${faq.id}-${index}`}
                            className="rounded-md border border-emerald-200/70 bg-emerald-50/70 px-2 py-1 text-[10px] text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>

                      <p className="mt-3 text-[10px] text-muted-foreground">
                        Prioritas: {faq.priority}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                      <button
                        type="button"
                        onClick={() => openEditFaq(faq)}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border bg-background/70 px-3 text-xs font-semibold transition hover:border-emerald-400/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => void toggleFaq(faq)}
                        className={cn(
                          "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition",
                          faq.is_active
                            ? "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
                        )}
                      >
                        {faq.is_active ? (
                          <>
                            <X className="h-3.5 w-3.5" />
                            Nonaktifkan
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Aktifkan
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* DIALOG TAMBAH / EDIT FAQ */}
      {faqDialogOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-emerald-200/70 bg-card shadow-2xl dark:border-emerald-900/50">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500"
            />

            <div className="flex items-center justify-between border-b border-emerald-100 p-5 dark:border-emerald-900/30">
              <div>
                <h2 className="text-lg font-bold">
                  {editingFaq ? "Edit FAQ" : "Tambah FAQ"}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Atur pertanyaan, kata kunci, dan jawaban otomatis.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFaqDialogOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted"
                aria-label="Tutup dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">
                  Pertanyaan FAQ
                </label>
                <input
                  value={faqQuestion}
                  onChange={(event) =>
                    setFaqQuestion(event.target.value)
                  }
                  placeholder="Contoh: Bagaimana cara reset password?"
                  className={`h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none ${fieldFocus}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold">
                  Kata Kunci
                </label>
                <input
                  value={faqKeywords}
                  onChange={(event) =>
                    setFaqKeywords(event.target.value)
                  }
                  placeholder="lupa password, reset password"
                  className={`h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none ${fieldFocus}`}
                />
                <p className="text-xs text-muted-foreground">
                  Pisahkan setiap kata kunci dengan koma.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold">
                  Jawaban Otomatis
                </label>
                <textarea
                  value={faqAnswer}
                  onChange={(event) =>
                    setFaqAnswer(event.target.value)
                  }
                  rows={5}
                  placeholder="Tulis jawaban yang akan dikirim otomatis..."
                  className={`w-full resize-y rounded-xl border bg-background px-3 py-3 text-sm leading-6 outline-none ${fieldFocus}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold">
                  Prioritas
                </label>
                <input
                  type="number"
                  value={faqPriority}
                  onChange={(event) =>
                    setFaqPriority(event.target.value)
                  }
                  className={`h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none ${fieldFocus}`}
                />
                <p className="text-xs text-muted-foreground">
                  Angka lebih besar akan ditampilkan lebih dahulu.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-emerald-100 p-4 dark:border-emerald-900/30">
              <button
                type="button"
                onClick={() => setFaqDialogOpen(false)}
                className="rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-muted"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={() => void saveFaq()}
                disabled={faqSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-700/25 transition hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50"
              >
                {faqSaving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {editingFaq
                  ? "Simpan Perubahan"
                  : "Simpan FAQ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
