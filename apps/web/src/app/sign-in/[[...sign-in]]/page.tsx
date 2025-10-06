import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <SignIn signUpFallbackRedirectUrl={"/dashboard/onboarding"} />;
}
