import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/product",
  "/how-it-works",
  "/case-studies",
  "/data",
  "/pricing",
  "/contact",
  "/sign-in(.*)",
  "/sign-up(.*)",
  ...(process.env.NEXT_PUBLIC_DEMO_MODE === "true"
    ? ["/client(.*)", "/admin(.*)"]
    : []),
]);

const clerkEnabled =
  process.env.NEXT_PUBLIC_DISABLE_CLERK !== "true" &&
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

function passthrough(_request: NextRequest) {
  return NextResponse.next();
}

const protectedMiddleware = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export default clerkEnabled ? protectedMiddleware : passthrough;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
