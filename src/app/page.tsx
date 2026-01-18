"use client";

import { useAuth } from "@/lib/auth-context";
import { ReadingFlow } from "@/components/ReadingFlow";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="loading-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main>
      <header className="header">
        <h1>Reading KG</h1>
        <div className="user-menu">
          <span className="user-email">{user.email}</span>
          <button onClick={signOut} className="btn-signout">
            Sign Out
          </button>
        </div>
      </header>
      <div className="container">
        <ReadingFlow />
      </div>
    </main>
  );
}
