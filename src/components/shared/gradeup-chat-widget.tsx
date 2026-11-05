
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
};

export function GradeUpChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mengambil identitas pengguna yang sedang login.
  const loadUser = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;

    if (!user) {
      setUserId(null);
      return null;
    }

    setUserId(user.id);
    return user;
  }, []);

  // Mengambil percakapan terakhir milik murid.
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

      setConversation(data as Conversation);
    } catch (error) {
      console.error("Gagal memuat percakapan:", error);
      toast.error("Gagal memuat percakapan chat.");
    } finally {
      setLoading(false);
    }
  }, [loadUser]);

  // Mengambil pesan dalam percakapan.
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
    }
  }, []);

  // Memuat percakapan ketika popup dibuka.
  useEffect(() => {
    if (isOpen) {
      void loadConversation();
    }
  }, [isOpen, loadConversation]);

  // Memuat pesan ketika percakapan ditemukan.
  useEffect(() => {
    if (!conversation?.id) {
      setMessages([]);
      return;
    }

    void loadMessages(conversation.id);
  }, [conversation?.id, loadMessages]);

  // Memperbarui pesan otomatis selama popup terbuka.
  // Polling ini tidak membuat baris database tambahan.
  useEffect(() => {
    if (!isOpen || !conversation?.id) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadMessages(conversation.id);
      }
    }, 4000);

    return () => window.clearInterval(interval);
  }, [isOpen, conversation?.id, loadMessages]);

  // Mengarahkan tampilan ke pesan paling baru.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  // Membuat percakapan jika murid belum memiliki percakapan.
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

    return newConversation;
  };

  // Mengirim pesan murid.
  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = messageInput.trim();

    if (!content || sending) return;

    if (content.length > 2000) {
      toast.error("Pesan maksimal 2.000 karakter.");
      return;
    }

    try {
      setSending(true);

      const user = await loadUser();

      if (!user) {
        toast.error("Silakan login kembali.");
        return;
      }

      const activeConversation = await getOrCreateConversation();

      const { error } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: activeConversation.id,
          sender_id: user.id,
          sender_type: "student",
          content,
        });

      if (error) throw error;

      setMessageInput("");

      await loadMessages(activeConversation.id);
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

  // Menutup dan menghapus seluruh riwayat dengan konfirmasi.
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

  return (
    <>
      {/* TOMBOL CHAT MENGAMBANG */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Buka bantuan GradeUp"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-900/20 transition-all hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/30 sm:bottom-7 sm:right-7"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-300" />
        </button>
      )}

      {/* POPUP CHAT */}
      {isOpen && (
        <section
          aria-label="Bantuan chat GradeUp"
          className="fixed bottom-4 right-3 z-50 flex h-[min(620px,calc(100dvh-2rem))] w-[calc(100vw-1.5rem)] max-w-[390px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:bottom-7 sm:right-7 sm:h-[600px]"
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
                  Tim bantuan siap membantu
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

          {/* STATUS */}
          {conversation && (
            <div className="flex shrink-0 items-center justify-between border-b bg-muted/40 px-4 py-2">
              <span className="text-xs text-muted-foreground">
                {conversation.status === "in_progress"
                  ? "Sedang ditangani admin"
                  : conversation.status === "resolved"
                    ? "Menunggu tindak lanjut"
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
                Tutup chat
              </button>
            </div>
          )}

          {/* AREA PESAN */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-muted/20 px-3 py-4 sm:px-4">
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
                      Ada yang bisa kami bantu?
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Asisten GradeUp
                    </p>
                  </div>
                </div>

                {messages.map((message) => {
                  const isStudent = message.sender_type === "student";
                  const isSystem = message.sender_type === "system";

                  return (
                    <div
                      key={message.id}
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
                  );
                })}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* INPUT PESAN */}
          <form
            onSubmit={handleSendMessage}
            className="flex shrink-0 items-end gap-2 border-t bg-card p-3"
          >
            <textarea
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              placeholder="Tulis pesan kamu..."
              rows={1}
              maxLength={2000}
              disabled={sending || !userId && loading}
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
              disabled={!messageInput.trim() || sending || loading}
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
