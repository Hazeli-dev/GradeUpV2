import { supabase } from "@/lib/supabase";

export async function checkAndUnlockAchievements(userId: string) {
  try {
    if (!userId) return;

    // 1. Ambil jumlah materi yang sudah dibaca oleh user
    const { count: readCount } = await supabase
      .from("student_material_reads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // 2. Ambil statistik ujian user
    const { data: attempts } = await supabase
      .from("exam_attempts")
      .select("score")
      .eq("user_id", userId);

    const totalExams = attempts?.length || 0;
    const hasPerfectScore = attempts?.some((a) => Number(a.score) === 100) || false;

    // 3. Evaluasi badge mana saja yang memenuhi syarat
    const eligibleBadges: string[] = [];

    if ((readCount || 0) >= 1) eligibleBadges.push("read_first");
    if ((readCount || 0) >= 10) eligibleBadges.push("read_master_10");
    if (totalExams >= 1) eligibleBadges.push("exam_first");
    if (totalExams >= 10) eligibleBadges.push("exam_warrior_10");
    if (hasPerfectScore) eligibleBadges.push("perfect_score");

    if (eligibleBadges.length === 0) return;

    // 4. Masukkan ke tabel student_achievements (ON CONFLICT DO NOTHING)
    const records = eligibleBadges.map((badgeId) => ({
      user_id: userId,
      badge_id: badgeId,
    }));

    await supabase.from("student_achievements").upsert(records, {
      onConflict: "user_id,badge_id",
      ignoreDuplicates: true,
    });
  } catch (err) {
    console.error("Gagal memeriksa pencapaian:", err);
  }
}
