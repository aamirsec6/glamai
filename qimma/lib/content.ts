export type Agent = {
  name: string;
  role: string;
  line: string;
  hue: string; // emissive tint used by 3D + UI
};

export const AGENTS: Agent[] = [
  {
    name: "Spark",
    role: "Content",
    line: "Writes and publishes Google Business posts your customers actually read.",
    hue: "#2dd6c8",
  },
  {
    name: "Sage",
    role: "Local SEO",
    line: "Tunes your profile and citations so Maps starts ranking you.",
    hue: "#7ff0d3",
  },
  {
    name: "Maya",
    role: "Leads",
    line: "Answers WhatsApp in seconds — qualifies intent, budget, and timeline.",
    hue: "#4cc9f0",
  },
  {
    name: "Scout",
    role: "Keywords",
    line: "Finds the searches your city is making and the gaps competitors leave.",
    hue: "#9bebc9",
  },
  {
    name: "Ruby",
    role: "Reviews",
    line: "Requests reviews at the right moment and drafts replies in your voice.",
    hue: "#5eead4",
  },
  {
    name: "Cleo",
    role: "Reporting",
    line: "Turns activity into a monthly scorecard: leads, rankings, pipeline.",
    hue: "#67e8f9",
  },
];

export const STEPS = [
  {
    n: "01",
    title: "Connect",
    body: "Link your Google Business Profile and WhatsApp number. Under ten minutes, no engineering.",
  },
  {
    n: "02",
    title: "Activate",
    body: "Agents switch on — posts publish, enquiries get qualified, reviews get answered, SEO gets tuned.",
  },
  {
    n: "03",
    title: "Measure",
    body: "Every lead, ranking move, and conversation lands in one pipeline you can actually read.",
  },
  {
    n: "04",
    title: "Grow",
    body: "A monthly scorecard tells you what moved and what the agents will do next.",
  },
];

export const FAQS = [
  {
    q: "How long does setup take?",
    a: "Most businesses connect Google Business Profile and WhatsApp in under ten minutes. We handle verification edge cases with you on a short call if anything is stuck.",
  },
  {
    q: "Will the WhatsApp AI sound like a bot to my customers?",
    a: "Maya is trained on your services, prices, and tone before going live. She asks the questions a good receptionist would — need, budget, timeline — and hands over to you the moment a conversation needs a human.",
  },
  {
    q: "Do you need full access to my Google account?",
    a: "No. You grant manager access to your Business Profile only — the standard, revocable Google permission. Your account, passwords, and other Google products stay untouched.",
  },
  {
    q: "Who owns the content and data?",
    a: "You do. Posts, replies, lead records, and reports belong to your business. Export everything at any time; if you leave, it leaves with you.",
  },
  {
    q: "How is my customer data handled?",
    a: "Conversations and lead data are encrypted in transit and at rest, stored in-region, and never used to train models for other businesses or sold to anyone.",
  },
  {
    q: "Which cities do you support?",
    a: "We're live across Bangalore, and onboarding businesses in Mumbai, Pune, Hyderabad, and Delhi NCR. Book a demo and we'll confirm coverage for your locality and category.",
  },
  {
    q: "Do you guarantee rankings or leads?",
    a: "No one can honestly guarantee a Maps position. What we commit to: complete profile optimisation, consistent posting, sub-minute WhatsApp response, and a transparent monthly scorecard — the inputs that reliably move rankings and leads.",
  },
  {
    q: "What if I want to cancel?",
    a: "Cancel anytime from your dashboard — no lock-in, no exit calls. Your profile and data stay yours.",
  },
];

export const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Case studies", href: "#case-studies" },
  { label: "Contact", href: "#contact" },
];
