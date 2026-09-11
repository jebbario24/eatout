import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { StorefrontShell, useResolvedSlug } from "@/components/storefront/StorefrontShell";
import { Markdown } from "@/components/Markdown";

export default function StorefrontPage() {
  const slug = useResolvedSlug();
  const { handle } = useParams();

  const { data: page, isLoading, isError } = useQuery<any>({
    queryKey: [`/api/storefront/${slug}/pages/${handle}`],
    enabled: !!slug && !!handle,
    queryFn: async () => {
      const r = await fetch(`/api/storefront/${slug}/pages/${handle}`);
      if (!r.ok) throw new Error("not found");
      return r.json();
    },
  });

  useEffect(() => {
    if (page) {
      document.title = page.seoTitle || page.title;
      const m = document.head.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (page.seoDescription) {
        if (m) m.content = page.seoDescription;
      }
    }
  }, [page]);

  return (
    <StorefrontShell slug={slug} activeHandle={handle}>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : isError || !page ? (
        <div className="py-16 text-center text-muted-foreground">This page doesn’t exist or hasn’t been published.</div>
      ) : (
        <article>
          <h1 className="mb-6 text-3xl font-bold">{page.title}</h1>
          <Markdown>{page.body || ""}</Markdown>
        </article>
      )}
    </StorefrontShell>
  );
}
