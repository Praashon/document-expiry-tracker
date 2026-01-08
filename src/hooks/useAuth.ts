"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const welcomeEmailSentRef = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  const refreshUser = useCallback(async () => {
    try {
      const {
        data: { user: freshUser },
      } = await supabase.auth.getUser();
      if (freshUser) {
        setUser(freshUser);
      }
      return freshUser;
    } catch (error) {
      console.error("Error refreshing user:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);

          const {
            data: { user: freshUser },
          } = await supabase.auth.getUser();

          if (freshUser) {
            setUser(freshUser);
          }
        }
      } catch (error) {
        console.error("Error getting initial session:", error);
      } finally {
        setLoading(false);
        initialLoadDone.current = true;
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;

      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        const {
          data: { user: freshUser },
        } = await supabase.auth.getUser();
        setUser(freshUser ?? currentUser);
      } else {
        setUser(currentUser);
      }

      if (initialLoadDone.current) {
        setLoading(false);
      }

      if (event === "SIGNED_IN" && currentUser) {
        const createdAt = new Date(currentUser.created_at);
        const now = new Date();
        const timeDiff = now.getTime() - createdAt.getTime();
        const minutesSinceCreation = timeDiff / (1000 * 60);

        if (
          minutesSinceCreation < 5 &&
          !welcomeEmailSentRef.current.has(currentUser.id)
        ) {
          welcomeEmailSentRef.current.add(currentUser.id);

          const identities = currentUser.identities || [];
          const googleIdentity = identities.find(
            (i: { provider?: string }) => i.provider === "google",
          ) as
            | {
                identity_data?: { name?: string; full_name?: string };
              }
            | undefined;

          const userName =
            currentUser.user_metadata?.name ||
            currentUser.user_metadata?.full_name ||
            googleIdentity?.identity_data?.name ||
            googleIdentity?.identity_data?.full_name ||
            currentUser.email?.split("@")[0] ||
            "User";

          fetch("/api/welcome", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: currentUser.email,
              name: userName,
            }),
          }).catch((err) => {
            console.error("Failed to send welcome email:", err);
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading, refreshUser };
}
