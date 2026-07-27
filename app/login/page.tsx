import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <Card className="w-full max-w-sm space-y-5">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Studyfolio</h1>
          <p className="mt-1 text-sm text-muted">Entre para continuar seus estudos.</p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>
      </Card>
    </main>
  );
}
