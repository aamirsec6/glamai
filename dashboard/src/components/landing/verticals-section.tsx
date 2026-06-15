import Link from "next/link";
import {
  Dumbbell,
  Scissors,
  Stethoscope,
  UtensilsCrossed,
  Wrench,
  Building2,
  Sparkles,
  Car,
  Plane,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const VERTICALS: { icon: LucideIcon; label: string }[] = [
  { icon: Dumbbell, label: "Gym & Fitness Centres" },
  { icon: Stethoscope, label: "Doctors & Health Clinics" },
  { icon: Scissors, label: "Salon Owners" },
  { icon: UtensilsCrossed, label: "Restaurants & Bars" },
  { icon: Building2, label: "Interior Designers" },
  { icon: Wrench, label: "Handyman Services" },
  { icon: Sparkles, label: "Yoga & Wellness" },
  { icon: Car, label: "Car Garages & Mechanics" },
  { icon: Plane, label: "Tours & Travels" },
];

export function VerticalsSection() {
  return (
    <section className="landing-section bg-slate-50">
      <div className="landing-container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Built for Small Business Owners
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            You focus on your craft and leave the hassle of growth marketing to
            GlamAI
          </p>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          {VERTICALS.map((v) => (
            <span key={v.label} className="landing-chip inline-flex items-center gap-2">
              <v.icon className="h-4 w-4" />
              {v.label}
            </span>
          ))}
        </div>

        <p className="mt-8 text-center text-sm font-medium text-slate-500">
          And many more businesses like yours
        </p>

        <div className="mt-8 text-center">
          <Link href="/sign-up" className="landing-btn-primary">
            Book Free Demo
          </Link>
        </div>
      </div>
    </section>
  );
}
