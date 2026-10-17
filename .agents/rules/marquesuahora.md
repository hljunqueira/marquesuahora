# Diretrizes e Regras do MarqueSuaHora para Agentes

Ao operar neste repositório, você deve seguir estritamente as seguintes normas:

## 1. Diretriz de Design e Interface
- **Zero Ícones Decorativos / Zero Emojis Ornamentais**:
  - Nunca insira emojis como elementos ornamentais (`💡`, `✨`, `🔥`, `🚀`, etc.) na interface, botões, headers, toasts ou cards.
  - Utilize design minimalista, tipografia moderna (Inter/Outfit), espaçamentos consistentes e ícones funcionais discretos.
- **Mobile First**:
  - A vitrine pública (`/[slug]`) e o dashboard devem funcionar perfeitamente em telas pequenas de smartphones (iOS e Android).

## 2. Padrões de Código e Arquitetura
- **Monorepo pnpm**:
  - Schemas compartilhados residem em `packages/shared/src/schemas/`. Sempre atualize os schemas Zod ao alterar campos no banco.
  - O backend reside em `apps/api/` e o frontend em `apps/web/`.
- **Validação de Tipos Obrigatória**:
  - Antes de finalizar qualquer alteração, rode `npx tsc --noEmit` em `apps/api` e em `apps/web`. A entrega só é aceita com **0 erros de compilação**.

## 3. Resiliência do Suporte com IA
- O chat de suporte ao assinante em `/dashboard/suporte` possui fallback local inteligente. Se a chamada para a API falhar ou demorar mais de 7 segundos, o motor integrado assume na hora. A IA nunca deve deixar o usuário sem resposta.

## 4. Consulta a Documentações e Skills
- Consulte a documentação em `docs/` (`PRD.md`, `INFRAESTRUTURA.md`, `ESPECIFICACOES_TECNICAS.md`, `HISTORICO_IMPLEMENTACOES.md`).
- Ative as skills do repositório:
  - `marquesuahora-guide`: Guia mestre do ecossistema.
  - `marquesuahora-prd`: Regras de negócio e fluxos de agendamento.
  - `marquesuahora-infra`: Infraestrutura, Docker, banco de dados e portas.
  - `gravitas`: Engenharia e refatorações complexas com validação de ponta a ponta.
  - `motion`: Animações e microinterações com `motion/react`.
