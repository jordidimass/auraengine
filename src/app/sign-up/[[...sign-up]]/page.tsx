import { SignUp } from "@clerk/nextjs";
import { DASHBOARD_PATH } from "@/lib/routes";

export default function SignUpPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center overflow-x-hidden bg-background px-4 py-10">
      <div className="w-full max-w-[400px]">
        <SignUp
          fallbackRedirectUrl={DASHBOARD_PATH}
          signInFallbackRedirectUrl={DASHBOARD_PATH}
        />
      </div>
    </div>
  );
}
