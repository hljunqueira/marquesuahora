# Documentação Técnica: Integração Google Calendar (Sincronização Bidirecional)

**Plataforma**: MarqueSuaHora  
**Data**: Outubro/2026  
**Status**: Especificação Técnica Aprovada / Pré-implementação

---

## 1. Visão Geral e Objetivos

A integração com o **Google Calendar** permite que profissionais e donos de salão/clínica mantenham suas agendas sincronizadas em tempo real entre o **MarqueSuaHora** e seus smartphones (Android e iOS):

1. **Sincronização Outbound (MarqueSuaHora ➔ Google)**: Qualquer agendamento criado ou remarcado (via Vitrine Online, WhatsApp Bot ou Recepção Manual) é imediatamente inserido no Google Calendar do profissional responsável.
2. **Sincronização Inbound (Google ➔ MarqueSuaHora)**: Quando o profissional cria um compromisso pessoal (ex: *Médico, Almoço, Reunião*) no app do Google Calendar do seu celular, o MarqueSuaHora cria automaticamente um **Bloqueio de Horário (`Block`)**, impedindo conflitos de agendamento na vitrine e no WhatsApp.

---

## 2. Pré-requisitos & Credenciais Google Cloud

Para habilitar a integração, as seguintes etapas devem ser executadas no [Google Cloud Console](https://console.cloud.google.com/):

### 2.1 Criar Projeto e Ativar APIs
1. Criar projeto: `MarqueSuaHora-Production`.
2. Em **APIs & Services ➔ Library**, buscar e ativar a **Google Calendar API**.

### 2.2 Configurar Tela de Consentimento OAuth (OAuth Consent Screen)
- **User Type**: `External`
- **App Name**: `MarqueSuaHora`
- **User Support Email**: contato/suporte do salão ou plataforma
- **Developer Contact**: desenvolvedor responsável
- **Scopes Obrigatórios**:
  - `https://www.googleapis.com/auth/calendar.events` (Leitura, criação e edição de eventos na agenda)
  - `https://www.googleapis.com/auth/userinfo.email` (Identificação da conta conectada)

### 2.3 Criar Credenciais OAuth 2.0 (Client ID)
- **Tipo de Aplicativo**: Web Application
- **Nome**: `MarqueSuaHora Web Client`
- **URIs de Redirecionamento Autorizados**:
  - `http://localhost:3001/v1/integrations/google/callback` (Dev)
  - `https://api.marquesuahora.com.br/v1/integrations/google/callback` (Produção)
- **Chaves Geradas**:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`

---

## 3. Variáveis de Ambiente Necessárias (`.env`)

Adicionar ao arquivo `.env` da API (`apps/api/.env` e `/root/marquesuahora/.env`):

```env
# Google Calendar Integration
GOOGLE_CLIENT_ID="seu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="seu-client-secret"
GOOGLE_REDIRECT_URI="https://api.marquesuahora.com.br/v1/integrations/google/callback"
```

---

## 4. Modelagem de Dados no Prisma (`apps/api/prisma/schema.prisma`)

```prisma
model GoogleCalendarIntegration {
  id              String       @id @default(uuid())
  tenantId        String
  professionalId  String       @unique
  email           String?      // Email da conta Google conectada
  accessToken     String       @db.Text
  refreshToken    String       @db.Text
  tokenExpiry     DateTime
  calendarId      String       @default("primary")
  channelId       String?      // ID único para Webhook Push Notification
  resourceId      String?      // Resource ID retornado pelo Google Push
  syncEnabled     Boolean      @default(true)
  lastSyncAt      DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  tenant          Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  professional    Professional @relation(fields: [professionalId], references: [id], onDelete: Cascade)
}

// Alterações nas entidades existentes:
// model Schedule {
//   ...
//   googleEventId  String?  @unique // Identificador do evento no Google Calendar
// }

// model Block {
//   ...
//   googleEventId  String?  @unique // Identificador de compromisso pessoal espelhado
// }
```

---

## 5. Arquitetura de Endpoints da API (`apps/api`)

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/v1/integrations/google/connect` | Gera a URL de autorização OAuth e redireciona o usuário para o Google. |
| `GET` | `/v1/integrations/google/callback` | Recebe o `code`, gera os tokens com `oauth2Client.getToken` e salva no banco. |
| `GET` | `/v1/integrations/google/status` | Retorna se a conta está conectada e o e-mail vinculado. |
| `POST` | `/v1/integrations/google/disconnect` | Revoga o token e remove a integração. |
| `POST` | `/v1/integrations/google/webhook` | Recebe notificações push do Google quando o profissional cria/altera evento no celular. |

---

## 6. Fluxos de Sincronização

### 6.1 Criar/Atualizar Evento no Google (Outbound)
```typescript
import { google } from 'googleapis';

export async function syncScheduleToGoogle(scheduleId: string) {
  // 1. Busca agendamento e credenciais do profissional
  // 2. Monta o cliente OAuth com refreshToken
  // 3. Monta o evento:
  const event = {
    summary: `${schedule.service.name} - ${schedule.client.name}`,
    description: `Cliente: ${schedule.client.name}\nWhatsApp: ${schedule.client.phone}\nNotas: ${schedule.notes || 'Nenhuma'}\n\nAgendado via MarqueSuaHora`,
    start: {
      dateTime: `${schedule.date.toISOString().slice(0, 10)}T${schedule.startTime}:00`,
      timeZone: 'America/Sao_Paulo'
    },
    end: {
      dateTime: `${schedule.date.toISOString().slice(0, 10)}T${schedule.endTime}:00`,
      timeZone: 'America/Sao_Paulo'
    }
  };

  // 4. Executa insert ou update
  if (schedule.googleEventId) {
    await calendar.events.update({ calendarId: 'primary', eventId: schedule.googleEventId, requestBody: event });
  } else {
    const res = await calendar.events.insert({ calendarId: 'primary', requestBody: event });
    await prisma.schedule.update({ where: { id: scheduleId }, data: { googleEventId: res.data.id } });
  }
}
```

### 6.2 Cancelamento / Exclusão
- Ao cancelar ou excluir um agendamento no MarqueSuaHora, chama `calendar.events.delete({ calendarId: 'primary', eventId: schedule.googleEventId })`.

---

## 7. Próximos Passos para Ativação

1. Obter `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no Google Cloud Console.
2. Aplicar a modelagem `GoogleCalendarIntegration` no Prisma (`prisma db push`).
3. Instalar o pacote oficial `googleapis` no `apps/api`.
4. Conectar o card de "Google Agenda" em `/dashboard/configuracoes`.
