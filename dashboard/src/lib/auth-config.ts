/** Clerk runs only when explicitly enabled and keys are present. */
export const isClerkEnabled =
  process.env.NEXT_PUBLIC_DISABLE_CLERK !== "true" &&
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
