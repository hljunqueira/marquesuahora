'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function OnboardingRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan) {
      router.replace(`/cadastro?plan=${encodeURIComponent(plan)}`);
    } else {
      router.replace('/cadastro');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-500 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      <p className="text-xs font-semibold">Redirecionando para o cadastro...</p>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-xs font-semibold">Carregando...</p>
        </div>
      }
    >
      <OnboardingRedirectContent />
    </Suspense>
  );
}
