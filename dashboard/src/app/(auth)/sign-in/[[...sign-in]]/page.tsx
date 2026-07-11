import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { isClerkEnabled } from "@/lib/auth-config";

export default function SignInPage() {
  if (!isClerkEnabled) {
    redirect("/client");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
          },
        }}
      />
    </div>
  );
}
