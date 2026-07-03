import { AuthGuard } from "~/components/layout/auth-guard";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <main className="w-full min-h-screen bg-black">
        {children}
      </main>
    </AuthGuard>
  );
}
