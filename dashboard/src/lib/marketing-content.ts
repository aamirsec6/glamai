/** Central marketing copy for the public website. */

export const SITE = {
  name: "GlamAI",
  tagline: "AI marketing for local businesses that want real leads.",
  email: "hello@glamai.in",
  phone: "+91 98765 43210",
  demoUrl: "/sign-up",
};

export const NAV_LINKS = [
  { label: "Product", href: "/product" },
  { label: "How it Works", href: "/how-it-works" },
  { label: "Case Studies", href: "/case-studies" },
  { label: "Data & Insights", href: "/data" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
] as const;

export const DATA_WE_COLLECT = [
  {
    category: "Business profile",
    items: ["Business name, address, city", "Google Business Profile connection", "Service categories & description", "Website & contact details"],
    purpose: "Optimize local search presence and generate on-brand content.",
  },
  {
    category: "Leads & conversations",
    items: ["WhatsApp messages (inbound)", "Lead name, phone, project scope", "Budget range & timeline (AI-extracted)", "Lead status & outcomes"],
    purpose: "Qualify leads instantly and route serious buyers to you.",
  },
  {
    category: "Marketing performance",
    items: ["GBP views, calls, clicks", "Keyword rankings", "Post performance", "Review text & ratings"],
    purpose: "Measure ROI and improve your monthly growth report.",
  },
  {
    category: "Competitive context",
    items: ["Nearby competitor ratings", "Competitor review counts", "Shared keyword positions"],
    purpose: "Benchmark your studio against the local market.",
  },
];

export const DATA_FOR_INSIGHTS = [
  { signal: "Lead funnel stages", insight: "Where deals drop off and which sources convert best" },
  { signal: "GBP engagement rates", insight: "Whether your profile turns views into calls and clicks" },
  { signal: "Content cadence", insight: "If posting frequency matches your visibility goals" },
  { signal: "Ranking trends", insight: "Which keywords are climbing or slipping in Maps" },
  { signal: "Review velocity", insight: "Reputation growth vs local competitors" },
  { signal: "Pipeline value", insight: "Estimated revenue in open leads by budget band" },
  { signal: "Cohort retention", insight: "Which signup months and plans stay active longest" },
  { signal: "Churn risk signals", insight: "Stale sync, zero leads, or paused accounts flagged early" },
];

export const CASE_STUDIES = [
  {
    slug: "studio-indiranagar",
    name: "Studio Indiranagar",
    industry: "Interior Design · Bangalore",
    headline: "From invisible on Maps to 8 qualified leads in 30 days",
    metrics: [
      { label: "GBP views", value: "+18%", sub: "month over month" },
      { label: "Qualified leads", value: "8", sub: "in first month" },
      { label: "Project won", value: "₹14L", sub: "from WhatsApp pipeline" },
      { label: "Maps rank", value: "#2", sub: "Indiranagar interior designer" },
    ],
    challenge:
      "A boutique studio with strong portfolio work but weak Google presence. Leads came only from referrals; GBP was outdated and WhatsApp inquiries went unanswered after hours.",
    solution:
      "GlamAI connected GBP and WhatsApp, deployed content agents for weekly posts, and enabled AI qualification on every inbound message. Monthly insights highlighted referral as the top-converting channel.",
    quote:
      "We stopped chasing cold inquiries. GlamAI tells us who is serious before we pick up the phone.",
    author: "Founder, Studio Indiranagar",
  },
  {
    slug: "design-hub-koramangala",
    name: "Design Hub Koramangala",
    industry: "Interior Design · Bangalore",
    headline: "4× GBP posts, 12 leads, and a predictable content calendar",
    metrics: [
      { label: "Posts published", value: "4/mo", sub: "AI-generated" },
      { label: "Leads", value: "12", sub: "last quarter" },
      { label: "Avg response", value: "<30s", sub: "WhatsApp AI" },
      { label: "Rating", value: "4.7★", sub: "47 reviews" },
    ],
    challenge:
      "Team was too busy on site to maintain GBP or reply to WhatsApp quickly. Competitors with worse work were winning on visibility alone.",
    solution:
      "Automated post generation with image captions, review auto-replies, and a weekly intelligence report the founder reads in five minutes.",
    quote: "It feels like we hired a marketing manager — without the salary.",
    author: "Operations lead, Design Hub",
  },
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Connect",
    desc: "Link Google Business Profile and WhatsApp in under 10 minutes. We sync your existing data securely.",
  },
  {
    step: "02",
    title: "Activate agents",
    desc: "AI agents publish GBP posts, qualify WhatsApp leads, reply to reviews, and optimize your profile.",
  },
  {
    step: "03",
    title: "Measure",
    desc: "Dashboards track leads, rankings, engagement, and pipeline value — updated from your real data.",
  },
  {
    step: "04",
    title: "Improve",
    desc: "Insights engine surfaces opportunities: fix funnel drop-offs, double down on winning channels, prevent churn.",
  },
];

export const PRODUCTS = [
  {
    title: "GBP Content Agent",
    desc: "AI posts, image captions, profile optimization, and competitor tracking.",
    href: "/product#gbp",
  },
  {
    title: "WhatsApp Qualification Agent",
    desc: "Instant replies, budget extraction, and hot-lead alerts.",
    href: "/product#whatsapp",
  },
  {
    title: "Review & Reputation Agent",
    desc: "Review requests and AI-written replies that build trust.",
    href: "/product#reviews",
  },
  {
    title: "Business Insights Engine",
    desc: "Funnel, forecast, SEO health, and prioritized growth actions.",
    href: "/data",
  },
];
