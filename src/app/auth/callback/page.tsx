"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const { error } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth callback error:", error);
        router.push("/login");
        return;
      }

      router.push("/");
    };

    handleCallback();
  }, [router]);

  return (
    <div className="loading-screen">
      <p>Signing in...</p>
    </div>
  );
}
