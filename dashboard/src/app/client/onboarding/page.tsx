"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import ApiClient from "@/lib/api";
import { useOrgId } from "@/lib/org-context";
import { isClerkEnabled } from "@/lib/auth-config";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Phone,
  MapIcon,
  PartyPopper,
  Building2,
  MapPin,
} from "lucide-react";

const STEPS = [
  { label: "Connect GBP", shortLabel: "GBP" },
  { label: "Location & keywords", shortLabel: "Location" },
  { label: "WhatsApp (optional)", shortLabel: "WhatsApp" },
  { label: "Complete", shortLabel: "Done" },
];

const CATEGORIES = [
  { value: "interior_design", label: "Interior Design" },
  { value: "dentist", label: "Dentist" },
  { value: "salon", label: "Salon" },
  { value: "gym", label: "Gym" },
  { value: "architect", label: "Architect" },
  { value: "photographer", label: "Photographer" },
  { value: "restaurant", label: "Restaurant" },
  { value: "bakery", label: "Bakery" },
  { value: "other", label: "Other" },
];

type GbpLocation = {
  name: string;
  title?: string;
  store_code?: string;
};

const inputClass =
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary";

function BusinessSignupForm({
  onCreated,
  clerkUser,
}: {
  onCreated: (orgId: string) => void;
  clerkUser: { id: string; primaryEmailAddress?: { emailAddress?: string | null } | null } | null;
}) {
  const { setOrgId } = useOrgId();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState(
    clerkUser?.primaryEmailAddress?.emailAddress ?? "",
  );
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("Bangalore");
  const [state, setState] = React.useState("Karnataka");
  const [pincode, setPincode] = React.useState("");
  const [website, setWebsite] = React.useState("");
      const [category, setCategory] = React.useState("bakery");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !address.trim()) {
      setError("Business name, email, phone, and address are required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.replace(/\D/g, ""),
        address: address.trim(),
        city: city.trim() || "Bangalore",
        state: state.trim() || "Karnataka",
        pincode: pincode.trim(),
        website: website.trim() || undefined,
        category,
      };
      if (clerkUser) {
        payload.clerk_user_id = clerkUser.id;
        payload.clerk_email = clerkUser.primaryEmailAddress?.emailAddress ?? email.trim();
      }
      const res = await ApiClient.createOrg(payload as never);
      if (!res?.data?.id) throw new Error("Failed to create organization");
      if (res.member_link_error) {
        console.warn("member_link_error", res.member_link_error);
      }
      setOrgId(res.data.id);
      onCreated(res.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your business account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Create your business
        </CardTitle>
        <CardDescription>
          We use this profile for local SEO, rankings, and your Google Business connection.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Business name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Phone</label>
              <input type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Business address</label>
            <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, landmark" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">City</label>
              <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">State</label>
              <input className={inputClass} value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">PIN code</label>
              <input className={inputClass} value={pincode} onChange={(e) => setPincode(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Website (optional)</label>
              <input className={inputClass} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Category</label>
              <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
            ) : (
              <>Continue to Google Business <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function BusinessSignupWithClerk({ onCreated }: { onCreated: (orgId: string) => void }) {
  const { user } = useUser();
  return (
    <BusinessSignupForm
      onCreated={onCreated}
      clerkUser={user ? { id: user.id, primaryEmailAddress: user.primaryEmailAddress } : null}
    />
  );
}

function StepGbp({
  orgId,
  onNext,
}: {
  orgId: string;
  onNext: () => void;
}) {
  const [connected, setConnected] = React.useState(false);
  const [gbpName, setGbpName] = React.useState<string | null>(null);
  const [linkSource, setLinkSource] = React.useState<string | null>(null);
  const [locations, setLocations] = React.useState<GbpLocation[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selecting, setSelecting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [hits, setHits] = React.useState<
    Array<{
      place_id: string;
      name: string;
      address?: string;
      rating?: number;
      review_count?: number;
    }>
  >([]);
  const [linkingId, setLinkingId] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const conn = await ApiClient.getGbpConnection(orgId);
      setConnected(!!conn.data?.connected);
      setGbpName(conn.data?.gbp_name ?? null);
      setLinkSource(conn.data?.link_source ?? null);
      if (conn.data?.connected) {
        try {
          const locs = await ApiClient.getGbpLocations(orgId);
          setLocations(locs.data?.locations ?? []);
          setSelected(locs.data?.selected ?? conn.data.place_id);
        } catch {
          setLocations([]);
        }
      }
    } catch {
      setError("Could not load GBP connection status");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gbp") === "connected") {
      window.history.replaceState({}, "", "/client/onboarding");
    }
    void refresh();
    void (async () => {
      try {
        const { data } = await ApiClient.getOrg(orgId);
        if (data?.name) setSearchQuery(`${data.name} ${data.city || ""}`.trim());
      } catch {
        /* ignore */
      }
    })();
  }, [refresh, orgId]);

  const handleSelect = async (name: string) => {
    setSelecting(true);
    setError("");
    try {
      await ApiClient.selectGbpLocation(orgId, name);
      setSelected(name);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to select location");
    } finally {
      setSelecting(false);
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    setError("");
    try {
      const res = await ApiClient.searchGbpPlaces(orgId, searchQuery.trim() || undefined);
      setHits(res.data?.results ?? []);
      if (!(res.data?.results?.length)) {
        setError("No businesses found — try a more specific name + area");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Places search failed");
      setHits([]);
    } finally {
      setSearching(false);
    }
  };

  const handleLinkPlace = async (placeId: string) => {
    setLinkingId(placeId);
    setError("");
    try {
      const res = await ApiClient.linkGbpPlace(orgId, placeId);
      setHits([]);
      setGbpName(res.data?.gbp_name ?? null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link business");
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Connect Google Business Profile
        </CardTitle>
        <CardDescription>
          The business owner signs in with Google so Qimma agents can post, reply to reviews, and
          sync their live profile — not a shared/demo account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking connection…
          </div>
        ) : connected ? (
          <div className="space-y-3 rounded-lg border border-success/20 bg-success/5 p-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm font-medium">
                {linkSource === "oauth" ? "Owner connected" : "Linked"}
                {gbpName ? ` — ${gbpName}` : ""}
                {linkSource === "places" ? " (Maps only — owner Google login still recommended)" : ""}
              </p>
            </div>
            {linkSource === "places" && (
              <Button
                size="sm"
                onClick={() => {
                  window.location.href = ApiClient.getGbpOAuthUrl(orgId);
                }}
              >
                Upgrade: sign in as owner
              </Button>
            )}
            {locations.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Multiple locations found — pick the right one:</p>
                {locations.map((loc) => (
                  <button
                    key={loc.name}
                    type="button"
                    disabled={selecting}
                    onClick={() => void handleSelect(loc.name)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm",
                      selected === loc.name
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50",
                    )}
                  >
                    <span>{loc.title || loc.name}</span>
                    {selected === loc.name && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">Owner Google login</p>
              <p className="text-sm text-muted-foreground">
                Have your friend use the Google account that manages Maharashtra Bakery on Google
                Business Profile. After they approve access, agents work on <em>their</em> business.
              </p>
              <Button
                onClick={() => {
                  window.location.href = ApiClient.getGbpOAuthUrl(orgId);
                }}
              >
                Continue with Google
              </Button>
            </div>

            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Can&apos;t sign in yet? Find on Google Maps (read-only)
              </summary>
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Public listing only — agents cannot publish as the business until owner login.
                </p>
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Maharashtra Bakery"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSearch();
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleSearch()}
                    disabled={searching}
                  >
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                  </Button>
                </div>
                {hits.length > 0 && (
                  <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-border p-2">
                    {hits.map((hit) => (
                      <button
                        key={hit.place_id}
                        type="button"
                        disabled={!!linkingId}
                        onClick={() => void handleLinkPlace(hit.place_id)}
                        className="flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm hover:bg-muted/60"
                      >
                        <span className="font-medium">{hit.name}</span>
                        <span className="text-xs text-muted-foreground">{hit.address}</span>
                        <span className="text-xs text-muted-foreground">
                          {hit.rating != null ? `★ ${hit.rating}` : "No rating"}
                          {hit.review_count != null ? ` · ${hit.review_count} reviews` : ""}
                          {linkingId === hit.place_id ? " · Linking…" : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-danger">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}
        <div className="flex justify-end">
          <Button size="sm" onClick={onNext} disabled={!connected}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StepTerritory({
  orgId,
  onNext,
  onBack,
}: {
  orgId: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("Bangalore");
  const [category, setCategory] = React.useState("bakery");
  const [radius, setRadius] = React.useState(5);
  const [keywords, setKeywords] = React.useState<string[]>([]);
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [conflictMsg, setConflictMsg] = React.useState("");

  React.useEffect(() => {
    void (async () => {
      try {
        const { data } = await ApiClient.getOrg(orgId);
        if (data.address) setAddress(data.address);
        if (data.city) setCity(data.city);
        if (data.category) setCategory(data.category);
      } catch {
        /* ignore */
      }
    })();
  }, [orgId]);

  const handleSave = async () => {
    if (!address.trim()) {
      setError("Enter a business address to geocode");
      return;
    }
    setSaving(true);
    setError("");
    setConflictMsg("");
    try {
      const geo = await ApiClient.geocodeOrg(orgId, { address: address.trim(), save: true });
      const lat = geo.data.latitude;
      const lng = geo.data.longitude;
      if (geo.data.formatted_address) setAddress(geo.data.formatted_address);

      const check = await ApiClient.checkTerritory(orgId, lat, lng);
      if (check.data?.has_conflict && check.data.resolution === "decline") {
        setError(check.data.message || "Territory conflict — choose another area");
        return;
      }
      if (check.data?.has_conflict) {
        setConflictMsg(check.data.message || "Nearby clients found — keywords will be partitioned.");
      }

      const claim = await ApiClient.claimTerritory({
        org_id: orgId,
        latitude: lat,
        longitude: lng,
        city: city.trim() || "Bangalore",
        category,
        radius_km: radius,
        address: geo.data.formatted_address || address.trim(),
      });
      setKeywords(claim.data?.assigned_keywords ?? []);
      await ApiClient.updateOrg(orgId, { onboarding_status: "territory_set" } as never);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim territory");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-primary" />
          Location & keywords
        </CardTitle>
        <CardDescription>
          Confirm where the business operates. We geocode this for rankings and assign local keywords.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Address</label>
          <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} disabled={saved} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">City</label>
            <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} disabled={saved} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Category</label>
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} disabled={saved}>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Service radius: {radius} km</label>
          <input
            type="range"
            min={2}
            max={15}
            value={radius}
            disabled={saved}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full"
          />
        </div>
        {!saved && (
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Geocode & claim territory"}
          </Button>
        )}
        {conflictMsg && <p className="text-xs text-amber-700">{conflictMsg}</p>}
        {saved && keywords.length > 0 && (
          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Assigned keywords</p>
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw) => (
                <span key={kw} className="rounded-full bg-muted px-2.5 py-1 text-xs">{kw}</span>
              ))}
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-danger">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button size="sm" onClick={onNext} disabled={!saved}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StepWhatsApp({
  orgId,
  onNext,
  onBack,
}: {
  orgId: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const [phone, setPhone] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const saveNumber = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Enter a valid WhatsApp number (min 10 digits)");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await ApiClient.updateOrg(orgId, {
        whatsapp_number: digits,
        whatsapp_verified: false,
      } as never);
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save number");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          WhatsApp (optional)
        </CardTitle>
        <CardDescription>
          Add later for lead routing and review requests. You can skip this step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Business WhatsApp number</label>
          <input
            type="tel"
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
          />
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-danger">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}
        <div className="flex justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onNext}>
              Skip for now
            </Button>
            <Button size="sm" onClick={() => void saveNumber()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & continue"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StepComplete({
  orgId,
  onBack,
}: {
  orgId: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [finishing, setFinishing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [checklist, setChecklist] = React.useState<Record<string, { done: boolean; required: boolean }> | null>(null);

  React.useEffect(() => {
    void ApiClient.getOrgSetup(orgId)
      .then((res) => setChecklist(res.data.checklist))
      .catch(() => setChecklist(null));
  }, [orgId]);

  const finish = async () => {
    setFinishing(true);
    setError("");
    try {
      await ApiClient.completeOnboarding(orgId);
      router.push("/client");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete onboarding");
      setFinishing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PartyPopper className="h-5 w-5 text-primary" />
          Ready to go
        </CardTitle>
        <CardDescription>
          We’ll activate agents, save settings, and kick off a geo bootstrap for this client.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {checklist && (
          <ul className="space-y-2 text-sm">
            {Object.entries(checklist).map(([key, item]) => (
              <li key={key} className="flex items-center gap-2">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <AlertCircle className={cn("h-4 w-4", item.required ? "text-danger" : "text-muted-foreground")} />
                )}
                <span className="capitalize">{key.replaceAll("_", " ")}</span>
                {!item.required && <span className="text-xs text-muted-foreground">(optional)</span>}
              </li>
            ))}
          </ul>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-danger">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={() => void finish()} disabled={finishing}>
            {finishing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Finishing…</>
            ) : (
              <>Go to dashboard <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OnboardingPage() {
  const { orgId, setOrgId, clearOrgId, isReady } = useOrgId();
  const [step, setStep] = React.useState(0);
  const [staleBanner, setStaleBanner] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isReady) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "org_not_found") {
      clearOrgId();
      setStaleBanner(
        "That business account was cleared (or never saved). Create it again below, then connect Google.",
      );
      window.history.replaceState({}, "", "/client/onboarding");
      return;
    }
    if (params.get("error") === "gbp_oauth_not_configured") {
      setStaleBanner(
        "Google Business Profile OAuth isn’t configured. Add real GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the API .env, then restart the API.",
      );
      window.history.replaceState({}, "", "/client/onboarding");
      return;
    }
    if (!orgId) return;
    void (async () => {
      try {
        const { data } = await ApiClient.getOrg(orgId);
        const status = data.onboarding_status;
        if (status === "created") setStep(0);
        else if (status === "gbp_connected" || status === "whatsapp_connected") setStep(1);
        else if (status === "territory_set") setStep(2);
        else if (status === "onboarding_complete" || status === "active") setStep(3);
      } catch (err) {
        const status = (err as { status?: number })?.status;
        if (status === 404 || status === 400 || status === 403) {
          clearOrgId();
          setStaleBanner(
            "Saved business ID is no longer in the database. Create the bakery account again to continue.",
          );
        }
      }
    })();
  }, [orgId, isReady, clearOrgId]);

  if (!isReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-8">
        {staleBanner && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{staleBanner}</p>
          </div>
        )}
        {isClerkEnabled ? (
          <BusinessSignupWithClerk onCreated={(id) => { setOrgId(id); setStep(0); setStaleBanner(null); }} />
        ) : (
          <BusinessSignupForm onCreated={(id) => { setOrgId(id); setStep(0); setStaleBanner(null); }} clerkUser={null} />
        )}
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="mx-auto max-w-xl space-y-6 py-4">
      {staleBanner && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{staleBanner}</p>
        </div>
      )}
      <div>
        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
          {STEPS.map((s, i) => (
            <span key={s.shortLabel} className={cn(i === step && "font-medium text-foreground")}>
              {s.shortLabel}
            </span>
          ))}
        </div>
        <Progress value={progress} />
      </div>

      {step === 0 && <StepGbp orgId={orgId} onNext={() => setStep(1)} />}
      {step === 1 && (
        <StepTerritory orgId={orgId} onNext={() => setStep(2)} onBack={() => setStep(0)} />
      )}
      {step === 2 && (
        <StepWhatsApp orgId={orgId} onNext={() => setStep(3)} onBack={() => setStep(1)} />
      )}
      {step === 3 && <StepComplete orgId={orgId} onBack={() => setStep(2)} />}
    </div>
  );
}
