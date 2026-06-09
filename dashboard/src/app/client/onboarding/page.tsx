"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Sparkles,
  Phone,
  MapIcon,
  PartyPopper,
  Building2,
} from "lucide-react";

// ── Types ──

interface FormData {
  gbpConnected: boolean;
  gbpPlaceId: string;
  whatsappPhone: string;
  whatsappConnected: boolean;
  territoryAddress: string;
  territoryCategory: string;
  territoryRadius: number;
  territoryConflict: boolean;
}

const STEPS = [
  { label: "Connect GBP", shortLabel: "GBP" },
  { label: "Connect WhatsApp", shortLabel: "WhatsApp" },
  { label: "Set Territory", shortLabel: "Territory" },
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
  { value: "other", label: "Other" },
];

// ── Step 1: Connect Google Business Profile ──

function Step1Gbp({
  formData,
  setFormData,
  onNext,
}: {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onNext: () => void;
}) {
  const [connecting, setConnecting] = React.useState(false);

  const handleConnect = () => {
    setConnecting(true);
    setTimeout(() => {
      setFormData((prev) => ({
        ...prev,
        gbpConnected: true,
        gbpPlaceId: "ChIJ_example123",
      }));
      setConnecting(false);
    }, 1500);
  };

  const canProceed = formData.gbpConnected;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Connect Google Business Profile
        </CardTitle>
        <CardDescription>
          Link your Google Business Profile to enable local search visibility,
          posts, and insights.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h4 className="text-sm font-medium text-foreground mb-2">
            What you&apos;ll get:
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              AI-powered Google Business Posts
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              Keyword ranking tracking
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              Views, clicks &amp; call analytics
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              Competitor insights
            </li>
          </ul>
        </div>

        {formData.gbpConnected ? (
          <div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/5 p-4">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <p className="text-sm font-medium text-success">
                Google Business Profile Connected!
              </p>
              <p className="text-xs text-muted-foreground">
                Place ID: {formData.gbpPlaceId}
              </p>
            </div>
          </div>
        ) : (
          <Button
            className="w-full"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Connect GBP
              </>
            )}
          </Button>
        )}

        <div className="flex justify-end">
          <Button
            variant={canProceed ? "default" : "outline"}
            size="sm"
            onClick={onNext}
            disabled={!canProceed}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Step 2: Connect WhatsApp ──

function Step2WhatsApp({
  formData,
  setFormData,
  onNext,
  onBack,
}: {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onNext: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = React.useState("");
  const [sentCode, setSentCode] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSendCode = () => {
    const phone = formData.whatsappPhone;
    if (phone.length < 10) {
      setError("Please enter a valid phone number (min 10 digits)");
      return;
    }
    setError("");
    setSentCode(true);
  };

  const handleVerify = () => {
    if (code.length < 4) {
      setError("Please enter the verification code");
      return;
    }
    setVerifying(true);
    setError("");
    setTimeout(() => {
      setFormData((prev) => ({ ...prev, whatsappConnected: true }));
      setVerifying(false);
    }, 1200);
  };

  const canProceed = formData.whatsappConnected;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          Connect WhatsApp
        </CardTitle>
        <CardDescription>
          Receive leads and respond to customers via WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            WhatsApp Phone Number
          </label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={formData.whatsappPhone}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  whatsappPhone: e.target.value,
                }))
              }
              placeholder="+91 98765 43210"
              className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={sentCode}
            />
            <Button
              variant="outline"
              onClick={handleSendCode}
              disabled={sentCode || formData.whatsappPhone.length < 10}
            >
              {sentCode ? "Sent" : "Send Code"}
            </Button>
          </div>
        </div>

        {sentCode && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Verification Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                maxLength={6}
              />
              <Button
                variant={formData.whatsappConnected ? "default" : "outline"}
                onClick={handleVerify}
                disabled={formData.whatsappConnected || code.length < 4}
              >
                {verifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying
                  </>
                ) : formData.whatsappConnected ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Verified
                  </>
                ) : (
                  "Verify"
                )}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-danger">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {formData.whatsappConnected && (
          <div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/5 p-4">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="text-sm font-medium text-success">
              WhatsApp verified and connected!
            </p>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            variant={canProceed ? "default" : "outline"}
            size="sm"
            onClick={onNext}
            disabled={!canProceed}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Step 3: Set Territory ──

function Step3Territory({
  formData,
  setFormData,
  onNext,
  onBack,
}: {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onNext: () => void;
  onBack: () => void;
}) {
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const handleSave = () => {
    if (!formData.territoryAddress.trim()) {
      setError("Please enter your business address");
      return;
    }
    if (!formData.territoryCategory) {
      setError("Please select a business category");
      return;
    }
    setError("");
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      // Simulate conflict detection for certain addresses
      const hasConflict = formData.territoryAddress
        .toLowerCase()
        .includes("mumbai");
      setFormData((prev) => ({ ...prev, territoryConflict: hasConflict }));
    }, 1200);
  };

  const canProceed = saved;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-primary" />
          Set Your Territory
        </CardTitle>
        <CardDescription>
          Define your service area so we can optimize your local presence.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Business Address
          </label>
          <input
            type="text"
            value={formData.territoryAddress}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                territoryAddress: e.target.value,
              }))
            }
            placeholder="123 Main Street, Mumbai, Maharashtra"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Business Category
          </label>
          <select
            value={formData.territoryCategory}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                territoryCategory: e.target.value,
              }))
            }
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          {formData.territoryCategory && (
            <div className="mt-2">
              <Badge variant="info">
                <Building2 className="mr-1 h-3 w-3" />
                {
                  CATEGORIES.find(
                    (c) => c.value === formData.territoryCategory
                  )?.label
                }
              </Badge>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-foreground">
              Service Radius
            </label>
            <span className="text-sm font-medium text-primary">
              {formData.territoryRadius} km
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={formData.territoryRadius}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                territoryRadius: Number(e.target.value),
              }))
            }
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1 km</span>
            <span>10 km</span>
          </div>
        </div>

        {/* Map Placeholder */}
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
          <div className="text-center">
            <MapPin className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Map preview will appear here
            </p>
            <p className="text-xs text-muted-foreground">
              Showing {formData.territoryRadius}km radius around your address
            </p>
          </div>
        </div>

        {/* Conflict Warning */}
        {formData.territoryConflict && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3">
            <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-warning">
                Territory overlap detected
              </p>
              <p className="text-xs text-muted-foreground">
                Another GlamAI client operates in this area. We&apos;ll
                coordinate to avoid conflicts.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-danger">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {saved && (
          <div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/5 p-4">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="text-sm font-medium text-success">
              Territory saved successfully!
            </p>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {!saved ? (
            <Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Territory"
              )}
            </Button>
          ) : (
            <Button variant="default" size="sm" onClick={onNext}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Step 4: Complete ──

function Step4Complete({
  formData,
  onGoToDashboard,
}: {
  formData: FormData;
  onGoToDashboard: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PartyPopper className="h-5 w-5 text-primary" />
          You&apos;re All Set!
        </CardTitle>
        <CardDescription>
          Your GlamAI account is fully configured and ready to go.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/5 p-3">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Google Business Profile connected
              </p>
              <p className="text-xs text-muted-foreground">
                Place ID: {formData.gbpPlaceId || "Connected"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/5 p-3">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                WhatsApp connected
              </p>
              <p className="text-xs text-muted-foreground">
                {formData.whatsappPhone}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/5 p-3">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Territory configured
              </p>
              <p className="text-xs text-muted-foreground">
                {formData.territoryAddress} · {formData.territoryRadius}km
                radius
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-primary">
              What happens next?
            </p>
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• AI starts monitoring for leads in your area</li>
            <li>• Weekly GBP posts will be auto-generated</li>
            <li>• You&apos;ll get WhatsApp notifications for new leads</li>
            <li>• Monthly reports show your growth</li>
          </ul>
        </div>

        <Button className="w-full" size="lg" onClick={onGoToDashboard}>
          Go to Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Main Onboarding Page ──

export default function ClientOnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [formData, setFormData] = React.useState<FormData>({
    gbpConnected: false,
    gbpPlaceId: "",
    whatsappPhone: "",
    whatsappConnected: false,
    territoryAddress: "",
    territoryCategory: "",
    territoryRadius: 5,
    territoryConflict: false,
  });

  const progressPct = Math.round(
    ((currentStep + 1) / STEPS.length) * 100
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Complete Your Setup
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Follow these 4 steps to get the most out of GlamAI
        </p>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Step {currentStep + 1} of {STEPS.length}
          </span>
          <span className="text-sm text-muted-foreground">{progressPct}%</span>
        </div>
        <Progress value={progressPct} />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => (
          <React.Fragment key={step.shortLabel}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  i < currentStep
                    ? "bg-success text-success-foreground"
                    : i === currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {i < currentStep ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "mt-1 text-xs",
                  i === currentStep
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 flex-1 transition-colors",
                  i < currentStep ? "bg-success" : "bg-muted"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      {currentStep === 0 && (
        <Step1Gbp
          formData={formData}
          setFormData={setFormData}
          onNext={() => setCurrentStep(1)}
        />
      )}
      {currentStep === 1 && (
        <Step2WhatsApp
          formData={formData}
          setFormData={setFormData}
          onNext={() => setCurrentStep(2)}
          onBack={() => setCurrentStep(0)}
        />
      )}
      {currentStep === 2 && (
        <Step3Territory
          formData={formData}
          setFormData={setFormData}
          onNext={() => setCurrentStep(3)}
          onBack={() => setCurrentStep(1)}
        />
      )}
      {currentStep === 3 && (
        <Step4Complete
          formData={formData}
          onGoToDashboard={() => router.push("/client")}
        />
      )}
    </div>
  );
}
