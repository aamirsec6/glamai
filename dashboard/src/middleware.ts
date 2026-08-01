import { NextResponse, type NextRequest } from "next/server";

const clerkEnabled =
  process.env.NEXT_PUBLIC_DISABLE_CLERK !== "true" &&
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) &&
  Boolean(process.env.CLERK_SECRET_KEY?.trim());

const publicPaths = [
  "/",
  "/product",
  "/how-it-works",
  "/case-studies",
  "/data",
  "/pricing",
  "/contact",
  "/qr-code-generator",
  "/sign-in",
  "/sign-up",
];

function isPublicPath(pathname: string) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    if (pathname.startsWith("/client") || pathname.startsWith("/admin")) {
      return true;
    }
  }
  return publicPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function passthrough(_request: NextRequest) {
  return NextResponse.next();
}

let middlewareHandler: (request: NextRequest) => ReturnType<typeof passthrough>;

if (clerkEnabled) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { clerkMiddleware } = require("@clerk/nextjs/server");
  middlewareHandler = clerkMiddleware(async (auth: () => { protect: () => void }, request: NextRequest) => {
    if (!isPublicPath(request.nextUrl.pathname)) {
      auth().protect();
    }
  });
} else {
  middlewareHandler = passthrough;
}

export default middlewareHandler;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
