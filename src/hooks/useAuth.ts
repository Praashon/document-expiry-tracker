"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading, refreshUser };
}
