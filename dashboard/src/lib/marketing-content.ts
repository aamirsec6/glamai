/** Central marketing copy for the public website. */

export const SITE = {
  name: "Qimma",
  tagline: "AI marketing for local businesses that want real leads.",
  email: "hello@qimma.io",
  phone: "+91 98765 43210",
  demoUrl: "/sign-up",
};

export const NAV_LINKS = [
  { label: "Product", href: "/product" },
  { label: "How it Works", href: "/how-it-works" },
  { label: "Case Studies", href: "/case-studies" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
] as const;

export const SERVICE_CHIPS = [
  "Google Profile",
  "WhatsApp AI",
  "Local SEO",
  "Lead Qualification",
  "Review Automation",
  "Growth Reports",
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
    purpose: "Benchmark your business against the local market.",
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
    tags: ["Local SEO", "WhatsApp AI", "GBP"],
    metrics: [
      { label: "GBP views", value: "+18%", sub: "month over month" },
      { label: "Qualified leads", value: "8", sub: "in first month" },
      { label: "Project won", value: "₹14L", sub: "from WhatsApp pipeline" },
      { label: "Maps rank", value: "#2", sub: "Indiranagar interior designer" },
    ],
    challenge:
      "A boutique studio with strong portfolio work but weak Google presence. Leads came only from referrals; GBP was outdated and WhatsApp inquiries went unanswered after hours.",
    solution:
      "Qimma connected GBP and WhatsApp, deployed content agents for weekly posts, and enabled AI qualification on every inbound message. Monthly insights highlighted referral as the top-converting channel.",
    quote:
      "We stopped chasing cold inquiries. Qimma tells us who is serious before we pick up the phone.",
    author: "Founder, Studio Indiranagar",
  },
  {
    slug: "design-hub-koramangala",
    name: "Design Hub Koramangala",
    industry: "Interior Design · Bangalore",
    headline: "4× GBP posts, 12 leads, and a predictable content calendar",
    tags: ["Content", "Reviews", "Leads"],
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

export const TRUST_STATS = [
  { value: "8", label: "Qualified leads", sub: "avg. first month" },
  { value: "<30s", label: "WhatsApp response", sub: "AI qualification" },
  { value: "Top 3", label: "Maps rankings", sub: "target position" },
];

export const HOME_FEATURES = [
  {
    title: "Instant visibility",
    desc: "Spark keeps your Google profile active with SEO-rich posts every week.",
    icon: "spark",
  },
  {
    title: "Deep rankings",
    desc: "Sage tracks Map Pack positions and plans your path to the top 3.",
    icon: "sage",
  },
  {
    title: "Always-on leads",
    desc: "Maya qualifies WhatsApp inquiries in seconds — day or night.",
    icon: "maya",
  },
] as const;

export const HOME_FEATURE_ROWS = [
  {
    step: "01",
    label: "Connect",
    title: "Link your business in minutes.",
    desc: "Connect Google Business Profile, confirm your location, and claim your local keywords. Scout maps your territory and hands off to the rest of the team.",
    cta: "Start onboarding",
    href: "/sign-up",
  },
  {
    step: "02",
    label: "Activate",
    title: "Your AI team starts working.",
    desc: "Sage tracks rankings, Spark publishes posts, Ruby manages reviews, and Cleo builds your weekly scorecard — all coordinated automatically.",
    cta: "Meet the agents",
    href: "/product#agents",
  },
  {
    step: "03",
    label: "Grow",
    title: "Turn visibility into revenue.",
    desc: "Qualified leads flow in via WhatsApp. Reviews climb. Rankings improve. You get clear next actions — not another dashboard to babysit.",
    cta: "See case studies",
    href: "/case-studies",
  },
] as const;

export const HOME_BENEFITS = [
  { value: "+48%", label: "More visibility", sub: "avg. GBP engagement lift" },
  { value: "<30s", label: "Lead response", sub: "WhatsApp qualification" },
  { value: "Top 3", label: "Maps target", sub: "local keyword goal" },
  { value: "6", label: "AI agents", sub: "one growth pipeline" },
] as const;

/** Local-business customer journey — Old vs Qimma funnel */
export const FUNNEL_STAGES = [
  {
    id: "found",
    label: "Get found",
    short: "Maps search",
    example: "Someone searches “salon near me” / “dentist Indiranagar”",
    oldWidth: 100,
    newWidth: 100,
    leakage: {
      type: "visibility" as const,
      title: "Visibility leak",
      detail: "Weak Maps rank, outdated profile, no posts — neighbors show up first.",
    },
    fix: {
      agents: ["Scout", "Sage", "Spark"],
      title: "Own the local search",
      detail: "Territory keywords, weekly rank tracking, fresh GBP posts.",
    },
  },
  {
    id: "trust",
    label: "Trust the profile",
    short: "GBP check",
    example: "They open your Google profile, photos, hours, reviews",
    oldWidth: 62,
    newWidth: 88,
    leakage: {
      type: "visibility" as const,
      title: "Profile leak",
      detail: "Thin description, old photos, silent profile — they bounce to a competitor.",
    },
    fix: {
      agents: ["Spark", "Ruby"],
      title: "Profile always working",
      detail: "Optimized copy, cadence of posts, strong review presence.",
    },
  },
  {
    id: "contact",
    label: "Reach out",
    short: "Call / WhatsApp",
    example: "They message or call after hours",
    oldWidth: 38,
    newWidth: 78,
    leakage: {
      type: "leads" as const,
      title: "Response leak",
      detail: "No reply until morning — the lead already booked someone else.",
    },
    fix: {
      agents: ["Maya"],
      title: "Reply in seconds",
      detail: "24/7 WhatsApp replies so interest never goes cold.",
    },
  },
  {
    id: "qualify",
    label: "Qualify",
    short: "Fit check",
    example: "Budget, timeline, service fit for a salon / clinic / studio",
    oldWidth: 28,
    newWidth: 65,
    leakage: {
      type: "leads" as const,
      title: "Qualification leak",
      detail: "You burn time on tire-kickers; serious buyers wait in the same inbox.",
    },
    fix: {
      agents: ["Maya", "Cleo"],
      title: "Only wake you for buyers",
      detail: "AI extracts budget & intent; hot leads get flagged.",
    },
  },
  {
    id: "win",
    label: "Book / win",
    short: "Closed",
    example: "Appointment booked or project confirmed",
    oldWidth: 18,
    newWidth: 48,
    leakage: {
      type: "leads" as const,
      title: "Follow-up leak",
      detail: "Quoted leads go quiet; no system nudges them back.",
    },
    fix: {
      agents: ["Maya", "Cleo"],
      title: "Close the gap",
      detail: "Pipeline visibility + next actions so deals don’t stall.",
    },
  },
  {
    id: "reviews",
    label: "Reviews & repeat",
    short: "Reputation",
    example: "Happy client leaves a public review → next customers trust you",
    oldWidth: 8,
    newWidth: 40,
    leakage: {
      type: "reputation" as const,
      title: "Reputation leak",
      detail: "No review ask after the visit; unanswered reviews sit on your profile.",
    },
    fix: {
      agents: ["Ruby"],
      title: "Turn wins into proof",
      detail: "Auto review requests + drafted replies that build trust.",
    },
  },
] as const;

export const FUNNEL_LEAK_LEGEND = [
  { type: "visibility", label: "Visibility", color: "amber" },
  { type: "leads", label: "Leads", color: "rose" },
  { type: "reputation", label: "Reputation", color: "orange" },
] as const;

export const HOME_TESTIMONIALS = [
  {
    quote:
      "We stopped chasing cold inquiries. Qimma tells us who is serious before we pick up the phone.",
    name: "Priya Sharma",
    role: "Founder, Studio Indiranagar",
  },
  {
    quote:
      "It feels like we hired a marketing manager — without the salary. Our profile stays active and leads actually convert.",
    name: "Rahul Mehta",
    role: "Operations, Design Hub",
  },
  {
    quote:
      "The weekly scorecard is the first report I read. Clear actions, real numbers, no fluff.",
    name: "Ananya Reddy",
    role: "Owner, Glow Salon",
  },
] as const;

export const HOME_PLANS = [
  {
    name: "Starter",
    price: "₹1,999",
    period: "/mo",
    desc: "Get found and respond instantly",
    features: ["GBP + WhatsApp AI", "4 posts/month", "Monthly report"],
    highlight: false,
  },
  {
    name: "Growth",
    price: "₹4,999",
    period: "/mo",
    desc: "Outrank local competitors",
    features: ["Everything in Starter", "Competitor tracking", "Review engine"],
    highlight: true,
    badge: "Most popular",
  },
  {
    name: "Enterprise",
    price: "₹7,999",
    period: "/mo",
    desc: "Own your territory",
    features: ["Everything in Growth", "5km exclusivity", "Priority support"],
    highlight: false,
  },
] as const;

export type AgentCastMember = {
  id: string;
  number: string;
  name: string;
  codename: string;
  title: string;
  mission: string;
  personality: readonly string[];
  sampleQuote: string;
  whileYouSleep: string;
  headline: string;
  href: string;
  avatar: "scout" | "sage" | "spark" | "maya" | "ruby" | "cleo";
  accent: string;
  border: string;
  glow: string;
  features: readonly string[];
  liveStatus: string;
};

export const AGENT_CAST: readonly AgentCastMember[] = [
  {
    id: "geo",
    number: "01",
    name: "Scout",
    codename: "Geo Agent",
    title: "Territory Scout",
    mission: "Maps your turf, blocks competitors, and assigns the keywords worth winning.",
    personality: ["Curious", "Protective", "Local"],
    sampleQuote:
      "I've scanned a 5km radius. Three competitors overlap your niche — here's the territory we can own.",
    whileYouSleep:
      "Geocodes your location, syncs nearby competitors from Google Places, and builds your priority keyword brief.",
    headline: "Own your neighborhood before rivals do",
    href: "/product#scout",
    avatar: "scout",
    accent: "from-indigo-500/20 to-violet-600/10",
    border: "border-indigo-500/30",
    glow: "mkt-agent-scout",
    liveStatus: "Mapping your 5km territory…",
    features: [
      "Territory mapping within your exclusivity zone",
      "Competitor discovery via Google Places",
      "Keyword niche assignment from your vertical pack",
      "Geo brief handed to every other agent",
      "5km exclusivity on Enterprise plans",
    ],
  },
  {
    id: "seo",
    number: "02",
    name: "Sage",
    codename: "SEO Agent",
    title: "Rank Strategist",
    mission: "Tracks every keyword, plans every move, and pushes you toward the Map Pack top 3.",
    personality: ["Sharp", "Data-driven", "Competitive"],
    sampleQuote:
      "You slipped from #4 to #6 on 'interior designer Indiranagar' — I've queued a targeted post and profile refresh.",
    whileYouSleep:
      "Runs weekly rank tracking, scores your Path to Top 3, and schedules SEO actions without waiting for you.",
    headline: "Weekly rankings, weekly scorecard, weekly wins",
    href: "/product#sage",
    avatar: "sage",
    accent: "from-cyan-500/20 to-sky-600/10",
    border: "border-cyan-500/30",
    glow: "mkt-agent-sage",
    liveStatus: "Tracking Map Pack rank #4…",
    features: [
      "Map Pack position tracking every week",
      "Path to Top 3 SEO scorecard",
      "Competitive gap analysis vs nearby rivals",
      "Prioritized action plan — not just data",
      "Keyword performance history",
    ],
  },
  {
    id: "gbp",
    number: "03",
    name: "Spark",
    codename: "GBP Agent",
    title: "Profile Publisher",
    mission: "Keeps your Google profile sharp, visible, and posting like you have a full-time marketer.",
    personality: ["Creative", "Consistent", "Upbeat"],
    sampleQuote:
      "This week's post is live — SEO-rich caption, on-brand image, optimized for 'modular kitchen Bangalore'.",
    whileYouSleep:
      "Writes and publishes GBP posts, refreshes your services list, and optimizes profile copy for local search.",
    headline: "Your Google profile, always working",
    href: "/product#spark",
    avatar: "spark",
    accent: "from-blue-500/20 to-indigo-600/10",
    border: "border-blue-500/30",
    glow: "mkt-agent-spark",
    liveStatus: "Publishing SEO GBP post…",
    features: [
      "4 AI-generated posts per month with captions",
      "Profile optimization for local keywords",
      "Service descriptions rewritten for SEO",
      "Image + caption generation",
      "Approval workflow before anything goes live",
    ],
  },
  {
    id: "lead",
    number: "04",
    name: "Maya",
    codename: "Lead Agent",
    title: "Lead Qualifier",
    mission: "Replies in seconds, asks the right questions, and only wakes you for buyers who mean business.",
    personality: ["Warm", "Fast", "Helpful"],
    sampleQuote:
      "New inquiry from Priya — budget ₹8–12L, timeline 6 weeks, scope: full home interior. I'd call this one hot.",
    whileYouSleep:
      "Answers every WhatsApp message in under 30 seconds, extracts budget and scope, and alerts you on hot leads.",
    headline: "24/7 replies that filter the tire-kickers",
    href: "/product#maya",
    avatar: "maya",
    accent: "from-emerald-500/20 to-green-600/10",
    border: "border-emerald-500/30",
    glow: "mkt-agent-maya",
    liveStatus: "Qualifying WhatsApp lead…",
    features: [
      "Instant WhatsApp replies under 30 seconds",
      "Budget, scope, and timeline extraction",
      "Vertical-trained flows — salon, clinic, studio & more",
      "Hot-lead alerts when someone's ready to close",
      "Full conversation history",
    ],
  },
  {
    id: "reviews",
    number: "05",
    name: "Ruby",
    codename: "Review Agent",
    title: "Reputation Guardian",
    mission: "Turns happy customers into public proof and handles every review with grace.",
    personality: ["Kind", "Trust-building", "Steady"],
    sampleQuote:
      "New 5-star review from last week's project — I've drafted a warm reply in your voice. Ready to publish?",
    whileYouSleep:
      "Sends review requests after won leads, drafts on-brand replies, and tracks your rating vs competitors.",
    headline: "Reviews that build trust on autopilot",
    href: "/product#ruby",
    avatar: "ruby",
    accent: "from-amber-500/20 to-orange-600/10",
    border: "border-amber-500/30",
    glow: "mkt-agent-ruby",
    liveStatus: "Drafting review reply…",
    features: [
      "Review requests after every won lead",
      "AI-drafted replies to Google reviews",
      "Review QR code for in-store customers",
      "Rating trend tracking vs local competitors",
      "Reputation insights in your monthly report",
    ],
  },
  {
    id: "insights",
    number: "06",
    name: "Cleo",
    codename: "Insights Engine",
    title: "Growth Oracle",
    mission: "Sees the full picture — funnel, forecast, and the one action that matters most this week.",
    personality: ["Clear-headed", "Prescient", "Calm"],
    sampleQuote:
      "Pipeline is up 22% but 3 leads stalled at 'quoted' — here's the follow-up that closes the gap.",
    whileYouSleep:
      "Synthesizes data from every agent into funnel analysis, revenue forecasts, and your monthly value report.",
    headline: "The brain that connects every signal",
    href: "/product#cleo",
    avatar: "cleo",
    accent: "from-violet-500/20 to-purple-600/10",
    border: "border-violet-500/30",
    glow: "mkt-agent-cleo",
    liveStatus: "Building weekly scorecard…",
    features: [
      "Lead funnel analysis and drop-off detection",
      "30-day revenue forecast from pipeline data",
      "Path to Top 3 weekly SEO scorecard",
      "Prioritized growth actions — not just charts",
      "Monthly value reports to your inbox",
    ],
  },
] as const;

/** @deprecated Use AGENT_CAST */
export const QIMMA_AGENTS = AGENT_CAST;

export const QIMMA_STACK = [
  { num: "01", agentId: "geo", name: "Scout", role: "Geo Agent", desc: "Territory & competitor mapping" },
  { num: "02", agentId: "seo", name: "Sage", role: "SEO Agent", desc: "Rankings & weekly scorecard" },
  { num: "03", agentId: "gbp", name: "Spark", role: "GBP Agent", desc: "Posts & profile optimization" },
  { num: "04", agentId: "lead", name: "Maya", role: "Lead Agent", desc: "WhatsApp qualification" },
  { num: "05", agentId: "reviews", name: "Ruby", role: "Review Agent", desc: "Reputation & review replies" },
  { num: "06", agentId: "insights", name: "Cleo", role: "Insights Engine", desc: "Funnel, forecast & reports" },
] as const;

export const AGENT_ROSTER_TAGLINE = "Six friendly specialists. One growth outcome.";

/** Comma-separated display names for marketing copy */
export const AGENT_NAMES_LINE = AGENT_CAST.map((a) => a.name).join(", ");

export const VERTICALS = [
  {
    title: "Salons & Spas",
    bullets: ["Local SEO for beauty keywords", "WhatsApp booking qualification", "Review growth from happy clients"],
    href: "/case-studies",
    gradient: "from-pink-500/20 to-rose-600/5",
  },
  {
    title: "Dental Clinics",
    bullets: ["Maps visibility for procedures", "Patient inquiry filtering", "Reputation management"],
    href: "/case-studies",
    gradient: "from-cyan-500/20 to-blue-600/5",
  },
  {
    title: "Interior Design",
    bullets: ["Portfolio-driven GBP posts", "Budget-qualified project leads", "Territory exclusivity"],
    href: "/case-studies",
    gradient: "from-amber-500/20 to-orange-600/5",
  },
  {
    title: "Bakeries & Cafés",
    bullets: ["Hyperlocal discovery", "Order & catering inquiries", "Seasonal campaign posts"],
    href: "/case-studies",
    gradient: "from-emerald-500/20 to-green-600/5",
  },
] as const;

export const VALUE_PROPS = [
  "Always-on AI agents",
  "Top 3 ranking target",
  "Qualified leads only",
  "Territory exclusivity",
  "Industry-specific flows",
] as const;
