"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/** Theo dõi user hiện tại ở phía client. */
export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // getSession() đọc phiên có sẵn ở trình duyệt — không tốn round-trip như
    // getUser(). Navbar hiện ở mọi trang nên đây là request nằm trên đường
    // găng của mọi lần tải trang. Chi tiết: lib/supabase/currentUser.ts.
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
