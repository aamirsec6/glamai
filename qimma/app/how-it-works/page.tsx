import { redirect } from "next/navigation";

/* The walkthrough lives on the landing page's pinned 3D chapter. */
export default function HowItWorksRoute() {
  redirect("/#how-it-works");
}
