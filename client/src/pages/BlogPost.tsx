import { useParams, Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { MarketingPage, PrimaryPill } from "@/components/marketing/MarketingUI";
import { getBlogPost } from "@/lib/blogPosts";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = getBlogPost(slug || "");

  if (!post) {
    return (
      <MarketingPage>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-[#1a1a1a]">Post not found</h1>
          <p className="mt-2 text-[#6d7175]">That article doesn't exist or has moved.</p>
          <Link href="/blog" className="mt-6 inline-block text-[#008060] hover:underline" data-testid="link-back-to-blog">
            ← Back to the blog
          </Link>
        </div>
      </MarketingPage>
    );
  }

  return (
    <MarketingPage>
      <article className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <Link href="/blog" className="mb-8 inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6d7175] hover:text-[#1a1a1a]" data-testid="link-back-to-blog">
          <ArrowLeft className="h-4 w-4" /> Back to the blog
        </Link>

        <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#008060]">{post.category}</p>
        <h1
          className="mt-2 text-[#1a1a1a]"
          style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 330, fontSize: "clamp(28px, 4vw, 42px)", lineHeight: 1.15 }}
        >
          {post.title}
        </h1>
        <p className="mt-3 text-[14px] text-[#6d7175]">
          {new Date(post.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} · {post.readTime}
        </p>

        <div className="mt-10 space-y-5">
          {post.content.map((paragraph, i) => (
            <p key={i} className="text-[17px] leading-[1.7] text-[#1a1a1a]">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-14 rounded-xl border border-[#e3e3e3] bg-white p-8 text-center">
          <h2 className="text-[20px] font-medium text-[#1a1a1a]">Ready to run your own online shop?</h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-[#6d7175]">
            Storefront, orders, payments, and fulfillment: one platform, no commission on your sales.
          </p>
          <div className="mt-5">
            <PrimaryPill onClick={() => (window.location.href = "/signup")} testId="button-blog-cta">
              Get Started Free
            </PrimaryPill>
          </div>
        </div>
      </article>
    </MarketingPage>
  );
}
