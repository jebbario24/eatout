import { useEffect } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { StorefrontShell, useResolvedSlug } from "@/components/storefront/StorefrontShell";
import { Markdown } from "@/components/Markdown";
import { Badge } from "@/components/ui/badge";

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "");

export function StorefrontBlogIndex() {
  const slug = useResolvedSlug();
  const base = slug ? `/store/${slug}` : "";

  const { data: posts = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/storefront/${slug}/blog`],
    enabled: !!slug,
    queryFn: async () => {
      const r = await fetch(`/api/storefront/${slug}/blog`);
      return r.ok ? r.json() : [];
    },
  });

  useEffect(() => { document.title = "Blog"; }, []);

  return (
    <StorefrontShell slug={slug}>
      <h1 className="mb-8 text-3xl font-bold">Blog</h1>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet.</p>
      ) : (
        <div className="space-y-8">
          {posts.map((p) => (
            <Link key={p.id} href={`${base}/blog/${p.handle}`} className="block group" data-testid={`blog-card-${p.handle}`}>
              {p.coverImageUrl && (
                <img src={p.coverImageUrl} alt={p.title} className="mb-3 aspect-[2/1] w-full rounded-lg object-cover" loading="lazy" />
              )}
              <h2 className="text-xl font-semibold group-hover:text-primary">{p.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {fmtDate(p.publishedAt)}{p.author ? ` · ${p.author}` : ""}
              </p>
              {p.excerpt && <p className="mt-2 text-muted-foreground">{p.excerpt}</p>}
            </Link>
          ))}
        </div>
      )}
    </StorefrontShell>
  );
}

export function StorefrontBlogPost() {
  const slug = useResolvedSlug();
  const { handle } = useParams();

  const { data: post, isLoading, isError } = useQuery<any>({
    queryKey: [`/api/storefront/${slug}/blog/${handle}`],
    enabled: !!slug && !!handle,
    queryFn: async () => {
      const r = await fetch(`/api/storefront/${slug}/blog/${handle}`);
      if (!r.ok) throw new Error("not found");
      return r.json();
    },
  });

  useEffect(() => {
    if (post) {
      document.title = post.seoTitle || post.title;
      const m = document.head.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (post.seoDescription && m) m.content = post.seoDescription;
    }
  }, [post]);

  return (
    <StorefrontShell slug={slug}>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : isError || !post ? (
        <div className="py-16 text-center text-muted-foreground">This post doesn’t exist or hasn’t been published.</div>
      ) : (
        <article>
          {post.coverImageUrl && (
            <img src={post.coverImageUrl} alt={post.title} className="mb-6 aspect-[2/1] w-full rounded-lg object-cover" />
          )}
          <h1 className="mb-2 text-3xl font-bold">{post.title}</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            {fmtDate(post.publishedAt)}{post.author ? ` · ${post.author}` : ""}
          </p>
          {Array.isArray(post.tags) && post.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-1.5">
              {post.tags.map((tag: string) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
            </div>
          )}
          <Markdown>{post.body || ""}</Markdown>
        </article>
      )}
    </StorefrontShell>
  );
}
