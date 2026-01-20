"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { ReaderView } from "@/components/Reader";
import type { ContentResource } from "@/types/content";
import type { Book } from "@/types/database";

export default function ReaderPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [resourceId, setResourceId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resource, setResource] = useState<ContentResource | null>(null);
  const [book, setBook] = useState<Book | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setResourceId(params.get("resourceId"));
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadResource() {
      if (!resourceId || !user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: resourceData, error: resourceError } = await supabase
          .from("content_resources")
          .select("*")
          .eq("id", resourceId)
          .single();

        if (resourceError || !resourceData) {
          setError("Resource not found");
          return;
        }

        setResource(resourceData as ContentResource);

        const { data: bookData, error: bookError } = await supabase
          .from("books")
          .select("*")
          .eq("id", (resourceData as ContentResource).book_id)
          .single();

        if (bookError || !bookData) {
          setError("Book not found");
          return;
        }

        setBook(bookData as Book);
      } catch (err) {
        console.error("Load error:", err);
        setError("Failed to load content");
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadResource();
    }
  }, [resourceId, user]);

  const handleClose = () => {
    router.back();
  };

  if (authLoading || loading) {
    return (
      <div className="loading-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!resourceId) {
    return (
      <div className="loading-screen">
        <p>Missing resource id</p>
        <button onClick={() => router.push("/")} className="btn-primary">
          Go Home
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-screen">
        <p>{error}</p>
        <button onClick={() => router.push("/")} className="btn-primary">
          Go Home
        </button>
      </div>
    );
  }

  if (!resource || !book) {
    return (
      <div className="loading-screen">
        <p>Content not available</p>
        <button onClick={() => router.push("/")} className="btn-primary">
          Go Home
        </button>
      </div>
    );
  }

  return <ReaderView resource={resource} book={book} onClose={handleClose} />;
}
