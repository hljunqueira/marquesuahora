# MarqueSuaHora — Especificações Técnicas e Contratos de Sistema

## 1. Estrutura do Monorepo

O projeto adota monorepo gerenciado por **pnpm workspaces**:
```
MarqueSuaHora/
├── apps/
│   ├── api/                 # Backend Node.js com Fastify 4 + Prisma ORM
│   │   ├── prisma/          # Schema do banco de dados relacional
│   │   ├── src/
│   │   │   ├── config/      # Variáveis de ambiente validadas via Zod
│   │   │   ├── lib/         # Singletons do Prisma, Redis, etc.
│   │   │   ├── modules/     # Módulos verticais de negócio
│   │   │   │   ├── ai/
│   │   │   │   ├── auth/
│   │   │   │   ├── clients/
│   │   │   │   ├── financial/
│   │   │   │   ├── public/
│   │   │   │   ├── schedules/
│   │   │   │   ├── services/
│   │   │   │   ├── support/
│   │   │   │   └── tenants/
│   │   │   ├── plugins/     # Plugins Fastify (segurança, JWT, erro)
│   │   │   └── app.ts       # Registro e build do servidor Fastify
│   │   └── test/            # Testes com Vitest
│   └── web/                 # Frontend React 18 / Next.js 14 App Router
│       ├── src/
│       │   ├── app/         # Rotas Next.js (Dashboard, Vitrine, Admin)
│       │   ├── components/  # Componentes reutilizáveis por domínio
│       │   │   ├── agenda/
│       │   │   ├── settings/
│       │   │   ├── showcase/
│       │   │   └── ui/
│       │   ├── lib/         # Cliente Axios e utilitários
│       │   └── hooks/       # Custom React Hooks
└── packages/
    └── shared/              # Schemas Zod, tipos TypeScript e DTOs compartilhados
```

---

## 2. Contratos de Dados Centrais (`packages/shared`)

### A. Configurações do Estabelecimento (`Tenant`)
```typescript
export const updateTenantSettingsSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  description: z.string().optional(),
  instagramUrl: z.string().url().optional().or(z.literal('')),
  
  // Proteção Anti-Falta Geral
  depositEnabled: z.boolean(),
  depositType: z.enum(['PERCENTAGE', 'FIXED']),
  depositValue: z.number().positive(),
  
  // Regra Exclusiva para a 1ª Cliente
  depositRequireFirstBooking: z.boolean(),
  depositFirstBookingType: z.enum(['PERCENTAGE', 'FIXED']),
  depositFirstBookingValue: z.number().positive(),
  
  // Chave PIX Direta
  pixKeyType: z.enum(['CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM']).optional(),
  pixKey: z.string().optional(),
  pixReceiverName: z.string().optional()
});
```

### B. Agendamento (`Schedule`)
```typescript
export interface ScheduleDetailsDTO {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  servicePrice: number;
  depositAmount: number;
  remainingAmount: number;
  professionalName: string;
  startAt: string;
  endAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_SERVICE' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  previousVisitsCount: number;
  noShowCount: number;
  lifetimeValue: number;
  procedurePhotos: Array<{ id: string; url: string; type: 'BEFORE' | 'AFTER' }>;
  anamnesisFilled: boolean;
}
```

---

## 3. Diretrizes de Arquitetura e Boas Práticas

1. **Zero Ícones Decorativos / Sem Emojis Ornamentais**:
   - É terminantemente proibido utilizar emojis ornamentais (`💡`, `🚀`, `✨`, `🔥`, etc.) nas interfaces, botões ou cards do sistema.
   - Usar tipografia clara, contrastes adequados e ícones funcionais em SVG/Lucide estritamente utilitários.
2. **Alta Disponibilidade e Zero Downtime no Suporte**:
   - Qualquer tela que consuma IA de suporte deve possuir fallback inteligente local em caso de oscilação na chamada de API.
3. **Isolamento Multi-Tenant Estrito**:
   - Toda consulta no banco relacional obrigatoriamente deve conter a cláusula `where: { tenantId }`, exceto consultas de administradores globais (`SUPER_ADMIN`).
4. **Tratamento de Exceções em Rotas**:
   - Nenhuma rota deve deixar exceções vazarem como erro 500 sem tratamento apropriado via `app.setErrorHandler` ou `try/catch` defensivo.
