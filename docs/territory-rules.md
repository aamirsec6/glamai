# Territory & Exclusivity Rules

## The Problem

When two competing businesses in the same area both use GlamAI, they compete
for the same Google rankings. Only one can be #1. This creates a conflict
that must be resolved **before** it happens.

## The Solution: Three-Tier Territory System

### Tier 1: Exclusive (Enterprise Plan — ₹7,999/mo)

- **No competing GlamAI client** within the defined radius
- Guarantee: **Top 1 rank** for target keywords
- Radius: 5-7 km (configurable by category)
- If a new client tries to sign up in an exclusive territory → **decline**

### Tier 2: Standard Non-Exclusive (Growth Plan — ₹4,999/mo)

- Competing clients **allowed** in the same area
- Keywords are **partitioned** — each client owns different search terms
- Guarantee: **Top 3 rank** for assigned keywords
- No territorial monopoly

### Tier 3: Basic Non-Exclusive (Starter Plan — ₹1,999/mo)

- Same as Growth but without priority support
- Keyword niches assigned on first-come-first-served basis
- Guarantee: **Top 3 rank** for assigned keywords

## Default Radius by Category

| Category | Radius | Rationale |
|----------|--------|-----------|
| Interior Designers | 7 km | City-wide market, referrals travel far |
| Dentists | 5 km | Patients choose within 3-5 km |
| Salons | 3 km | People go to the nearest good salon |
| Gyms | 5 km | Similar to dentists |

## Conflict Resolution Flow

```
New client signs up
        │
        ▼
Check territory (category + radius + city)
        │
        ├── No conflict → Onboard normally
        │
        └── Conflict found
                │
                ├── Existing client is EXCLUSIVE
                │       │
                │       ├── Offer different location
                │       ├── Offer waitlist (when exclusivity expires)
                │       └── Decline
                │
                └── Existing client is STANDARD
                        │
                        ├── Find uncontested keyword niches
                        │       │
                        │       ├── Found → Onboard with keyword partition
                        │       └── Not found → Offer exclusivity upgrade
                        │                         to existing client OR
                        │                         decline new client
                        │
                        └── Assign keyword niches
```

## Keyword Niche Partitioning

When multiple non-exclusive clients exist in the same area, keywords are
divided so each client targets different search terms:

**Example: Two interior designers in Indiranagar**

| Client A | Client B |
|----------|----------|
| "best interior designer Indiranagar" | "modular kitchen Indiranagar" |
| "3BHK interior Bangalore" | "office interior Bangalore" |
| "home renovation Indiranagar" | "luxury interior design Bangalore" |
| "modern interior designer" | "wardrobe design Indiranagar" |

This way, both can rank Top 3 for their respective keywords without
directly competing.

## Contract Clause

Include this in the Terms of Service:

> **Territory Exclusivity.** GlamAI offers territory-based exclusivity
> for Enterprise plan subscribers. Within the defined radius and business
> category, GlamAI will not onboard competing businesses. Standard and
> Growth plan subscribers accept that competing businesses may operate
> in the same area, with keyword-based differentiation. GlamAI reserves
> the right to manage keyword assignments to minimize direct competition
> between clients.

## Territory Release

When a client churns:
1. Territory status → RELEASED
2. Keyword niches → RELEASED
3. Freed keywords become available for new clients
4. If the territory was exclusive, the area opens up
