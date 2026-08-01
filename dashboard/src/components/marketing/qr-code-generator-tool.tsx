"use client";

import * as React from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  buildGbpReviewUrl,
  parsePlaceIdFromMapsUrl,
} from "@/lib/gbp-review-link";
import { SITE } from "@/lib/marketing-content";
import { Check, Copy, Download, MapPin, QrCode, Star, UserPlus } from "lucide-react";

const STEPS = [
  {
    icon: UserPlus,
    title: "Sign up free",
    description: "Create your Qimma account and connect Google Business Profile.",
  },
  {
    icon: MapPin,
    title: "Add your business",
    description: "We pull your place ID automatically — or paste a Maps link below.",
  },
  {
    icon: Download,
    title: "Download & print",
    description: "Put the QR at your counter, on invoices, or in WhatsApp follow-ups.",
  },
];

export function QrCodeGeneratorTool() {
  const [businessName, setBusinessName] = React.useState("");
  const [mapsInput, setMapsInput] = React.useState("");
  const [placeId, setPlaceId] = React.useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reviewUrl = buildGbpReviewUrl(placeId);

  React.useEffect(() => {
    const parsed = parsePlaceIdFromMapsUrl(mapsInput);
    setPlaceId(parsed);
    setError(parsed || !mapsInput.trim() ? null : "Paste a valid Google Maps link or Place ID (ChIJ…).");
  }, [mapsInput]);

  React.useEffect(() => {
    if (!reviewUrl) {
      setQrDataUrl(null);
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(reviewUrl, {
      width: 220,
      margin: 2,
      color: { dark: "#f8fafc", light: "#0a0a0a" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [reviewUrl]);

  const handleCopy = async () => {
    if (!reviewUrl) return;
    await navigator.clipboard.writeText(reviewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const anchor = document.createElement("a");
    anchor.href = qrDataUrl;
    anchor.download = "qimma-review-qr.png";
    anchor.click();
  };

  return (
    <div className="mkt-container space-y-16">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="mkt-card">
          <p className="mkt-eyebrow">Try it now</p>
          <h2 className="mkt-heading mt-3 text-2xl">Generate your review QR</h2>
          <p className="mkt-body mt-3 text-sm">
            Paste your Google Maps business URL or Place ID. No account needed for the preview.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="text-zinc-300">Business name (optional)</span>
              <input
                className="mkt-input"
                placeholder="Studio Indiranagar"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-300">Google Maps link or Place ID</span>
              <input
                className="mkt-input"
                placeholder="https://maps.google.com/... or ChIJ..."
                value={mapsInput}
                onChange={(e) => setMapsInput(e.target.value)}
              />
            </label>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          {reviewUrl && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Review link</p>
              <p className="mt-1 break-all text-sm text-zinc-200">{reviewUrl}</p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="mkt-btn-ghost"
              onClick={handleCopy}
              disabled={!reviewUrl}
            >
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <button
              type="button"
              className="mkt-btn-primary"
              onClick={handleDownload}
              disabled={!qrDataUrl}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PNG
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="mkt-card-3d mkt-float w-full max-w-sm p-8 text-center">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="Google review QR code preview"
                className="mx-auto h-[220px] w-[220px] rounded-lg"
              />
            ) : (
              <div className="mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5">
                <QrCode className="h-16 w-16 text-zinc-600" />
              </div>
            )}
            <p className="mt-6 text-lg font-semibold text-white">
              {businessName.trim() || "Your business"}
            </p>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-zinc-400">
              <Star className="h-4 w-4 fill-neutral-900 text-neutral-900" />
              Scan to leave a Google review
            </p>
          </div>
          <Link href={SITE.demoUrl} className="mkt-btn-primary mt-8">
            Get started with Qimma
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mkt-heading text-center text-2xl sm:text-3xl">
          Get your QR code in 3 simple steps
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.title} className="mkt-card text-center">
              <div className="mkt-icon-box mx-auto">
                <step.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold text-white">{step.title}</h3>
              <p className="mkt-body mt-2 text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
