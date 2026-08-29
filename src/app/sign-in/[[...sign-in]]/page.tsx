import { SignIn } from "@clerk/nextjs";
import { DASHBOARD_PATH } from "@/lib/routes";

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center overflow-x-hidden bg-background px-4 py-10">
      <div className="w-full max-w-[400px]">
        <SignIn
          fallbackRedirectUrl={DASHBOARD_PATH}
          signUpFallbackRedirectUrl={DASHBOARD_PATH}
        />
      </div>
    </div>
  );
}
