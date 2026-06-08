# Guarantee Framework

## The Problem

You want to promise results to clients. But Google rankings depend on factors
you can't control: competitor activity, algorithm updates, the client's
existing online presence.

Promise too much → refunds → churn → death spiral.
Promise too little → no one signs up.

## The Solution: Guarantee What You Control

### What You CAN Control (Guarantee These)

| Guarantee | Measurement | Fulfillment |
|-----------|-------------|-------------|
| 4 GBP posts per month | Count of posts published | ✅ Fully controllable |
| WhatsApp response < 30 seconds | AI response time | ✅ Fully controllable |
| Monthly value report | Report delivered by 5th of month | ✅ Fully controllable |
| GBP fully optimized | Checklist completed within 48h | ✅ Fully controllable |
| Lead notifications in < 2 min | Notification delivery time | ✅ Fully controllable |

### What You CANNOT Control (Don't Guarantee These)

| Factor | Why You Can't Control It |
|--------|--------------------------|
| Google #1 rank | Depends on competitors, algorithm, existing authority |
| Exact lead volume | Depends on market demand, seasonality |
| Review count | Depends on clients asking for reviews |
| Revenue | Depends on client's sales process |

### What You CAN Influence (Guarantee Effort, Not Outcome)

| Area | What You Guarantee | What You Don't |
|------|-------------------|----------------|
| Rankings | "We optimize for Top 3 and show weekly progress" | "You'll be #1 in 30 days" |
| Leads | "We generate and qualify leads via GBP + WhatsApp" | "You'll get 30 leads/month" |
| Reviews | "We request reviews after every project" | "You'll get 8 reviews in 60 days" |

## Guarantee Tiers by Plan

### Starter (₹1,999/mo)

> "We guarantee:
> - ✅ 4 optimized GBP posts per month
> - ✅ WhatsApp AI responds in under 30 seconds
> - ✅ Monthly value report delivered by the 5th
> - ✅ GBP fully optimized within 48 hours of onboarding
> - 🎯 We target Top 3 rankings for your keywords (results vary by competition)"

### Growth (₹4,999/mo)

> "Everything in Starter, plus:
> - ✅ Priority keyword optimization
> - ✅ Competitor monitoring (top 5 competitors tracked)
> - ✅ Bi-weekly ranking reports
> - 🎯 We target Top 3 rankings with dedicated keyword strategy"

### Enterprise (₹7,999/mo)

> "Everything in Growth, plus:
> - ✅ Territory exclusivity (no competing GlamAI client in 5km)
> - ✅ Dedicated keyword territory (6+ keywords)
> - ✅ Monthly strategy call
> - 🎯 We target Top 1 ranking for your primary keywords"

## The "Money-Back" Clause

For Enterprise clients only:

> "If we don't deliver 4 GBP posts, monthly reports, and WhatsApp AI
> response within the guaranteed timeframe, you get a full month free.
> This does not apply to ranking positions, which depend on factors
> outside our control."

## How to Handle "But My Friend Got 30 Leads/Month"

Context matters. Lead volume depends on:
1. **Location** — Whitefield has more new apartments than Jayanagar
2. **Season** — Diwali season = 2x leads
3. **Budget range** — ₹5-10L projects get more leads than ₹20L+
4. **Competitor activity** — If 5 new designers opened nearby, leads drop
5. **Client responsiveness** — If they don't call leads back, leads "dry up"

Always frame it as: "We generate and qualify leads. What happens after
the lead reaches you is your sales process."

## Tracking Guarantee Fulfillment

The `Org` model tracks:
- `guarantee_gbp_posts_delivered` — incremented each time a post is published
- `guarantee_leads_generated` — incremented for each new lead
- `guarantee_reviews_collected` — incremented for each new review
- `guarantee_start_date` — when the guarantee period began

The admin dashboard shows guarantee fulfillment per client.
