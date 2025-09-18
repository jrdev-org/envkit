import { SignIn } from "@clerk/nextjs";
import { env } from "@/env.js";

export default function SignInPage() {
  return (
    <SignIn
      forceRedirectUrl={env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL}
    />
  );
}
