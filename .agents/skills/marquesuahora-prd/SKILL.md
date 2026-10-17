---
name: marquesuahora-prd
description: Guia de regras de negócio, personas, fluxos de agendamento, vitrine pública, proteção anti-falta (sinal PIX) e módulos funcionais do MarqueSuaHora.
---

# Skill de Produto e Regras de Negócio — MarqueSuaHora

Esta skill deve ser consultada sempre que o agente for implementar ou modificar regras de negócio, fluxos de vitrine, agendamento, proteção anti-falta, cálculo de comissões ou políticas de cancelamento.

## 1. Regra de Proteção Anti-Falta (Sinal PIX Direto)
- **Objetivo**: Reduzir a zero o índice de faltas (no-show) nos salões e barbearias.
- **Funcionamento**:
  - O tenant escolhe se quer exigir sinal de forma geral (`depositEnabled`).
  - O salão pode configurar **Regra Exclusiva para a 1ª Cliente** (`depositRequireFirstBooking`, `depositFirstBookingType`, `depositFirstBookingValue`).
  - Modalidades suportadas:
    - **`PERCENTAGE`**: Percentual sobre o valor total do serviço (ex: 30%, 50%).
    - **`FIXED`**: Valor monetário fixo em reais (ex: R$ 20,00, R$ 50,00).
  - O backend calcula dinamicamente se o telefone da cliente possui agendamentos anteriores (`previousBookingsCount === 0`) para aplicar a regra da 1ª cliente ou a regra geral.
  - **Repasse Direto**: O dinheiro vai 100% direto para a conta do estabelecimento via chave PIX cadastrada. A plataforma **não retém** nem cobra taxa sobre o sinal.

## 2. Fluxo da Vitrine Pública (`/[slug]`)
1. **Passo 1 (Serviços)**: Seleção de serviços com nome, duração em minutos e preço.
2. **Passo 2 (Profissional)**: Seleção do profissional parceiro qualificado ou opção de alocação automática ("Qualquer Profissional").
3. **Passo 3 (Data & Horário)**: Apenas horários válidos conforme expediente (`scheduleConfig`) sem conflito com agendamentos ou bloqueios existentes.
4. **Passo 4 (Identificação & Pagamento)**: Nome, telefone com WhatsApp, resumo financeiro discriminando valor total e sinal a pagar via chave PIX. Botão com link pré-formatado para o WhatsApp com comprovante.

## 3. Diretrizes de Interface (UI/UX)
- **Zero Ícones Decorativos**: É proibido o uso de emojis ornamentais (`💡`, `🔥`, `✨`, etc.) nos componentes, headers ou formulários.
- **Mobile First**: 95% dos clientes finais agendam pelo celular via link da bio do Instagram.
- **Transparência Financeira**: Sempre exibir claramente o valor total, o valor pago de sinal e o saldo restante a pagar no balcão do salão.
