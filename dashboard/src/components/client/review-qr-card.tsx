"use client";

import * as React from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildGbpReviewUrl } from "@/lib/gbp-review-link";
import { cn } from "@/lib/utils";
import { Check, Copy, Download, QrCode, Star } from "lucide-react";

type ReviewQrCardProps = {
  businessName: string;
  placeId?: string | null;
  connected?: boolean;
  subtitle?: string;
  className?: string;
  onConnect?: () => void;
  compact?: boolean;
};

export function ReviewQrCard({
  businessName,
  placeId,
  connected = true,
  subtitle,
  className,
  onConnect,
  compact = false,
}: ReviewQrCardProps) {
  const reviewUrl = buildGbpReviewUrl(placeId);
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!reviewUrl) {
      setQrDataUrl(null);
      return;
    }

    let cancelled = false;
    setError(null);

    QRCode.toDataURL(reviewUrl, {
      width: compact ? 200 : 240,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not generate QR code.");
          setQrDataUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reviewUrl, compact]);

  const handleCopy = async () => {
    if (!reviewUrl) return;
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link.");
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const anchor = document.createElement("a");
    anchor.href = qrDataUrl;
    anchor.download = `${slug || "glamai"}-review-qr.png`;
    anchor.click();
  };

  if (!connected || !placeId) {
    return (
      <Card className={className}>
        <CardHeader className={compact ? "pb-3" : undefined}>
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-5 w-5 text-primary" />
            Review QR Code
          </CardTitle>
          <CardDescription>
            Connect Google Business Profile to generate a scannable review link for your counter,
            invoices, and WhatsApp follow-ups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {onConnect ? (
            <Button size="sm" onClick={onConnect}>
              Connect Google
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Link your Google Business Profile first.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className={compact ? "pb-3" : undefined}>
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="h-5 w-5 text-primary" />
          Review QR Code
        </CardTitle>
        <CardDescription>
          Print or share this code so happy customers can leave a Google review in one scan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "flex flex-col gap-6",
            !compact && "lg:flex-row lg:items-start",
          )}
        >
          <div className="flex shrink-0 flex-col items-center gap-3">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt={`QR code to review ${businessName} on Google`}
                  className={cn(compact ? "h-[200px] w-[200px]" : "h-[240px] w-[240px]")}
                />
              ) : (
                <div
                  className={cn(
                    "flex items-center justify-center rounded-lg bg-muted text-muted-foreground",
                    compact ? "h-[200px] w-[200px]" : "h-[240px] w-[240px]",
                  )}
                >
                  <QrCode className="h-10 w-10 opacity-40" />
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">{businessName}</p>
              {subtitle && (
                <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
              )}
              <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-warning text-warning" />
                Scan to leave a Google review
              </p>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Review link
              </p>
              <p className="mt-1 break-all text-sm text-foreground">{reviewUrl}</p>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleCopy} disabled={!reviewUrl}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy link
                  </>
                )}
              </Button>
              <Button size="sm" onClick={handleDownload} disabled={!qrDataUrl}>
                <Download className="mr-2 h-4 w-4" />
                Download PNG
              </Button>
            </div>

            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>· Place at your reception desk or on project handover documents.</li>
              <li>· Qimma can also send this link automatically after a lead is marked won.</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
