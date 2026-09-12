import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { MarketingPage } from "@/components/marketing/MarketingUI";
import { BLOG_POSTS } from "@/lib/blogPosts";

export default function Blog() {
  return (
    <MarketingPage>
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#008060]">The EatOut Blog</p>
          <h1
            className="text-[#1a1a1a]"
            style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 330, fontSize: "clamp(32px, 4.5vw, 52px)", lineHeight: 1.1 }}
          >
            Branding, marketing, and running an online shop
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] text-[#6d7175]">
            Practical, no-fluff writing for people running a real online business — not growth-hacking theory.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-xl border border-[#e3e3e3] bg-white p-6 transition-shadow hover:shadow-md"
              data-testid={`link-blog-post-${post.slug}`}
            >
              <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#008060]">{post.category}</p>
              <h2 className="mt-2 text-[20px] font-medium leading-snug text-[#1a1a1a]">{post.title}</h2>
              <p className="mt-2 text-[14px] leading-[1.5] text-[#6d7175]">{post.excerpt}</p>
              <div className="mt-4 flex items-center justify-between text-[13px] text-[#6d7175]">
                <span>{new Date(post.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} · {post.readTime}</span>
                <ArrowRight className="h-4 w-4 text-[#008060] transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </MarketingPage>
  );
}
