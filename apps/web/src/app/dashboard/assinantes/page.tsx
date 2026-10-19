'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AssinantesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/cursos?tab=subscribers');
  }, [router]);

  return (
    <div className="py-24 flex flex-col items-center justify-center text-zinc-400">
      <Loader2 className="w-8 h-8 animate-spin text-zinc-800 mb-2" />
      <p className="text-xs font-semibold text-zinc-600">Redirecionando para Cursos &amp; Alunas...</p>
    </div>
  );
}
