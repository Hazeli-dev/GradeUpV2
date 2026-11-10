
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type MembershipStatus = {
  isPremium: boolean | null;
  isLoading: boolean;
  userId: string | null;
};

export function useStudentMembership(): MembershipStatus {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const checkMembership = useCallback(
    async (currentUserId?: string | null) => {
      try {
        let id: string | null;

        if (currentUserId === undefined) {
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser();

          if (error) throw error;

          id = user?.id ?? null;
        } else {
          id = currentUserId;
        }

        setUserId(id);

        if (!id) {
          setIsPremium(null);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("plan, is_premium, premium_until")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;

        const premiumUntil = data?.premium_until
          ? new Date(data.premium_until).getTime()
          : 0;

        const activePremium =
          data?.plan === "Premium" &&
          data?.is_premium === true &&
          Number.isFinite(premiumUntil) &&
          premiumUntil > Date.now();

        setIsPremium(activePremium);
      } catch (error) {
        console.error("Gagal memeriksa membership:", error);
        setIsPremium(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void checkMembership();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoading(true);
      void checkMembership(session?.user?.id ?? null);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setIsLoading(true);
        void checkMembership();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      subscription.unsubscribe();

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [checkMembership]);

  return {
    isPremium,
    isLoading,
    userId,
  };
}
