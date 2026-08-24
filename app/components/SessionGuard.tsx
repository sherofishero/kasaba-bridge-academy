"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function SessionGuard() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    async function checkActiveSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return;
      }

      const sessionId = localStorage.getItem("kasabaSessionId");

      if (!sessionId) {
        return;
      }

      const { data, error } = await supabase
        .from("user_sessions")
        .select("session_id")
        .eq("user_id", session.user.id)
        .single();

      if (error || !data) {
        return;
      }

      if (data.session_id !== sessionId) {
        alert("Bu hesap başka bir yerde açıldı.");

        localStorage.removeItem("kasabaSessionId");
        localStorage.removeItem("guestName");

        await supabase.auth.signOut();

        router.push("/");
      }
    }

    checkActiveSession();

    timer = setInterval(() => {
      checkActiveSession();
    }, 3000);

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [router]);

  return null;
}