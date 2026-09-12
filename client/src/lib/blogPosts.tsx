export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  content: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "building-a-brand-customers-remember",
    title: "Building a Brand Customers Remember",
    excerpt: "Branding isn't a logo. It's the sum of every small decision a customer notices, and here's where to actually spend your time.",
    category: "Branding",
    date: "2027-01-12",
    readTime: "6 min read",
    content: [
      "Most new business owners think branding means picking a logo and a color palette. Those matter, but they're the last 10% of the work. The other 90% is consistency: making sure that every touchpoint a customer has with your business, from your storefront to your packaging to how you answer a complaint, feels like it came from the same place.",
      "Start with one sentence that describes what makes your business different from the ten other shops selling something similar. Not \"quality products.\" Everyone says that. Something specific: \"Same-day arrangements for people who forgot,\" or \"The only grocer in town that tells you exactly what's in season this week.\" If you can't write that sentence, your customers can't either, and that's what they'd tell a friend.",
      "Once you have that sentence, audit everything against it. Does your storefront's About section say it? Does your packaging reflect it? Does your customer service tone match it? A lot of small businesses have a polished logo sitting on top of an inconsistent experience, and customers notice the inconsistency far more than they notice the logo.",
      "Visual identity still matters, but keep it simple and repeatable. Pick one accent color, one font pairing, and use them everywhere: your storefront, your emails, your packaging. The goal isn't to look expensive. It's to look like the same business every single time, so recognition builds automatically instead of you having to re-introduce yourself every time.",
      "Finally, protect your brand's tone in customer interactions, especially when something goes wrong. A refund handled warmly builds more loyalty than a smooth transaction ever will, because it's the moment a customer actually tests whether your brand promise is real. That's branding. Everything else is decoration.",
    ],
  },
  {
    slug: "marketing-tactics-that-move-the-needle",
    title: "5 Marketing Tactics That Actually Move the Needle for Small Online Shops",
    excerpt: "Skip the vanity metrics. These are the five channels that consistently pay off for shops without a marketing budget.",
    category: "Marketing",
    date: "2027-01-19",
    readTime: "7 min read",
    content: [
      "Small shops don't have marketing budgets for national ad campaigns, and they don't need them. The highest-leverage marketing for a small online business is almost always cheap, direct, and aimed at people who already know you exist.",
      "1. Win back customers who already ordered once. A first-time customer converting a second time is far cheaper than acquiring a brand-new one. An automated \"we miss you\" message to anyone who hasn't ordered in 30 days, with a small incentive, consistently outperforms cold outreach.",
      "2. Turn your best customers into your sales team. A simple referral program (give a discount, get a discount) works because it puts your offer in front of people who already trust the person sharing it. Trust converts far better than any ad.",
      "3. Use abandoned cart recovery relentlessly. A meaningful percentage of carts get abandoned at checkout for reasons that have nothing to do with price: a distraction, an unclear shipping cost, a second thought. A single well-timed reminder recovers a real share of that lost revenue for close to zero cost.",
      "4. Post where your actual customers already are, not where marketing advice tells you to be. If your audience is local parents, that might be a neighborhood Facebook group, not TikTok. Go where the conversation already exists instead of building a new one from scratch.",
      "5. Make your first-order experience so good people talk about it. Free organic word-of-mouth remains the highest-converting channel there is, and it's built entirely by what happens after checkout: packaging, speed, a handwritten note, a doorbell that doesn't ring at midnight. Marketing budgets rarely buy this. Good operations do.",
    ],
  },
  {
    slug: "reduce-cart-abandonment-increase-repeat-orders",
    title: "10 Tips to Reduce Cart Abandonment and Increase Repeat Orders",
    excerpt: "Small friction points quietly cost online shops real revenue every day. Here's what to fix first.",
    category: "Tips",
    date: "2027-02-02",
    readTime: "8 min read",
    content: [
      "1. Show the total cost early. Surprise fees at the final step are the single biggest cause of last-minute checkout abandonment. If shipping or fees apply, show them before the customer commits to filling out their details.",
      "2. Let guests check out without creating an account. Every extra required field is a chance for someone to give up. You can always invite them to create an account after the order is placed, once they've already committed.",
      "3. Make your return/refund policy visible before checkout, not after. Uncertainty about what happens if something goes wrong is a silent reason people abandon carts, not because they expect a problem, but because unknowns feel risky.",
      "4. Send exactly one abandoned-cart reminder, not three. One well-timed, helpful reminder recovers most of what's recoverable. More than that reads as pressure and can push people toward unsubscribing entirely.",
      "5. Keep your product pages honest about availability. Nothing kills repeat business faster than someone ordering an item that turns out to be out of stock. Keep inventory accurate, even approximately, rather than optimistic.",
      "6. Follow up after delivery, not just after purchase. A short \"how did everything arrive?\" message, sent once things have actually arrived, catches problems before they become public complaints and shows customers someone is paying attention.",
      "7. Make reordering effortless. If a customer buys the same thing every two weeks, don't make them rebuild their cart from scratch every time. A one-click reorder from order history is one of the highest-ROI features a repeat-purchase business can offer.",
      "8. Reward the second order more than the first. Acquisition discounts get all the attention, but a discount timed for someone's second purchase is what actually turns a one-time buyer into a repeat customer.",
      "9. Keep your storefront fast. Every extra second of load time on mobile measurably increases the odds someone leaves before finishing checkout. Compress images, avoid unnecessary embeds, and test on a real phone, not just a desktop browser.",
      "10. Ask why, when people cancel or don't come back. A single optional \"what changed?\" question on a cancellation flow gives you more useful information than months of guessing.",
    ],
  },
  {
    slug: "how-eatouts-no-commission-model-works",
    title: "How EatOut's No-Commission Model Works (And Why It Matters)",
    excerpt: "Marketplace commissions quietly eat 15-30% of every order. Here's the actual math on owning your own online store instead.",
    category: "EatOut",
    date: "2027-02-14",
    readTime: "5 min read",
    content: [
      "Most delivery marketplaces charge a commission on every single order, often somewhere between 15% and 30% of the order value, before payment processing fees are even factored in. On a $40 order, that can mean the platform keeps $6 to $12 before the business sees a cent of profit. Over a year of steady orders, that adds up to a meaningful share of total revenue disappearing before it ever reaches the business that did the work.",
      "EatOut works differently: you pay a flat monthly subscription, not a cut of every sale. Whether you process ten orders a month or ten thousand, the platform fee stays the same. That means your margins actually improve as you grow, instead of a marketplace taking a bigger absolute cut the more successful you become.",
      "There's a second cost that's easy to miss: on a marketplace, the customer relationship belongs to the marketplace, not to you. They control the app, the customer data, and often the delivery experience. On your own storefront, every customer who orders is your customer. Their contact details, their order history, their loyalty: all of it stays with your business, so you can market to them directly instead of paying to reach them again through someone else's platform.",
      "Owning your own store also means owning your own fulfillment decisions. Ship with whatever carrier makes sense for your product, or handle pickup and local delivery yourself. There's no marketplace dictating which drivers you're allowed to use or taking a cut of that leg of the transaction either.",
      "The tradeoff is that a marketplace hands you built-in discovery (customers already browsing that app) while your own storefront requires you to bring your own traffic. That's a real tradeoff, not a free lunch. But for a business with any existing customer base, whether that's foot traffic, a social following, or word of mouth, the economics of owning the relationship directly, order after order, compound in your favor in a way a commission model never will.",
    ],
  },
  {
    slug: "idea-to-first-sale-launch-checklist",
    title: "From Idea to First Sale: A Practical Launch Checklist",
    excerpt: "A no-nonsense list of what actually needs to happen before you open your online store to real customers.",
    category: "Tips",
    date: "2027-02-27",
    readTime: "6 min read",
    content: [
      "Before you spend a single dollar on marketing, get these fundamentals right. They're what determine whether your first real customers become second-time customers.",
      "Nail your core catalog first. Don't launch with fifty products of uncertain quality when twelve excellent ones would build more trust. You can always expand once you know what actually sells.",
      "Price for your real costs, not just your competitors. Factor in payment processing, packaging, and your own time before you copy a competitor's price. A business that's secretly losing money on every order isn't sustainable no matter how many customers it attracts.",
      "Set up payments and test a real transaction yourself, start to finish, before inviting anyone else to. It's the single most common thing that quietly breaks right before a real launch, and you want to be the one who finds that, not your first customer.",
      "Write your policies (shipping timelines, returns, cancellations) before you need them, not after your first dispute. Customers trust businesses that are upfront about what happens when something doesn't go perfectly.",
      "Tell the ten people most likely to actually order before you tell the internet. A soft launch to people who already know and trust you surfaces real problems, like a confusing checkout step or a missing product photo, while the stakes are still low.",
      "Plan your first week of order volume realistically, and make sure you can actually fulfill it without corners being cut. A slightly slower, more careful launch beats a fast one that damages trust with your very first customers.",
      "Finally, decide before launch how you'll collect feedback after each order. The businesses that improve fastest aren't the ones with the best initial plan. They're the ones with the tightest feedback loop once real orders start coming in.",
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
