'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardReputacaoPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/configuracoes?tab=REPUTATION');
  }, [router]);

  return (
    <div className="w-full flex items-center justify-center p-12 text-slate-500 text-sm">
      <span>Redirecionando para Configurações...</span>
    </div>
  );
}
