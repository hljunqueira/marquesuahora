import { NotificationTrigger } from '@prisma/client';

export interface TemplateMetadata {
  trigger: NotificationTrigger;
  category: 'SCHEDULE' | 'POST_SERVICE' | 'TEAM' | 'WAITLIST' | 'FINANCIAL' | 'COURSES' | 'MARKETING';
  recipientType: 'CLIENT' | 'TEAM' | 'STUDENT';
  title: string;
  description: string;
  defaultWhatsappText: string;
  defaultEmailSubject: string;
  defaultEmailBody: string;
  variables: string[];
}

export const OFFICIAL_TEMPLATES: Record<NotificationTrigger, TemplateMetadata> = {
  BOOKING_CONFIRMATION_CLIENT: {
    trigger: 'BOOKING_CONFIRMATION_CLIENT',
    category: 'SCHEDULE',
    recipientType: 'CLIENT',
    title: 'Confirmação de Agendamento',
    description: 'Enviada para o cliente imediatamente após a criação do agendamento.',
    defaultWhatsappText:
      `Agendamento Confirmado!\n\n` +
      `Que felicidade poder te receber aqui e cuidar de você, {client_first_name}!\n` +
      `Seu horário no {business_name} está confirmado com sucesso.\n\n` +
      `Detalhes do seu agendamento:\n` +
      `• Serviço: {service_name}\n` +
      `• Profissional: {professional_name}\n` +
      `• Data: {date}\n` +
      `• Horário: {time}\n` +
      `• Duração estimada: {duration}\n` +
      `• Endereço: {location}\n\n` +
      `Informações importantes:\n` +
      `• Eventuais imprevistos ou remarcações devem ser avisados com antecedência.\n` +
      `• A tolerância para atrasos é de até 10 minutos para não comprometer os próximos horários.\n\n` +
      `Temos café, água e um espaço acolhedor à sua espera. Até breve!\n\n` +
      `Mensagem enviada por {business_name}.`,
    defaultEmailSubject: 'Agendamento Confirmado — {business_name}',
    defaultEmailBody:
      `<p>Olá, <strong>{client_first_name}</strong>!</p>` +
      `<p>Seu horário no <strong>{business_name}</strong> está confirmado com sucesso.</p>` +
      `<ul>` +
      `<li><strong>Serviço:</strong> {service_name}</li>` +
      `<li><strong>Profissional:</strong> {professional_name}</li>` +
      `<li><strong>Data e Horário:</strong> {date} às {time}</li>` +
      `<li><strong>Local:</strong> {location}</li>` +
      `</ul>` +
      `<p>A tolerância máxima para atrasos é de 10 minutos. Te esperamos!</p>`,
    variables: [
      '{client_first_name}',
      '{client_name}',
      '{service_name}',
      '{services_list}',
      '{professional_name}',
      '{date}',
      '{time}',
      '{duration}',
      '{location}',
      '{business_name}',
      '{booking_url}'
    ]
  },

  BOOKING_REMINDER_CLIENT: {
    trigger: 'BOOKING_REMINDER_CLIENT',
    category: 'SCHEDULE',
    recipientType: 'CLIENT',
    title: 'Lembrete de Agendamento (24h antes)',
    description: 'Enviada 24 horas antes do horário para confirmação prévia de presença.',
    defaultWhatsappText:
      `Lembrete de Horário!\n\n` +
      `Olá, {client_first_name}! Passando para lembrar do seu atendimento no {business_name}:\n\n` +
      `• Data: Amanhã ({date})\n` +
      `• Horário: {time}\n` +
      `• Serviço: {service_name}\n` +
      `• Profissional: {professional_name}\n` +
      `• Local: {location}\n\n` +
      `Podemos confirmar sua presença?\n` +
      `Responda 1 para Confirmar ou 2 se precisar remarcar.`,
    defaultEmailSubject: 'Lembrete: Seu horário amanhã no {business_name}',
    defaultEmailBody:
      `<p>Olá, <strong>{client_first_name}</strong>!</p>` +
      `<p>Lembramos do seu horário amanhã (<strong>{date} às {time}</strong>) para o serviço <strong>{service_name}</strong>.</p>` +
      `<p>Endereço: {location}</p>` +
      `<p>Caso precise reagendar ou tenha algum imprevisto, entre em contato com antecedência.</p>`,
    variables: [
      '{client_first_name}',
      '{client_name}',
      '{service_name}',
      '{professional_name}',
      '{date}',
      '{time}',
      '{duration}',
      '{location}',
      '{business_name}'
    ]
  },

  BOOKING_UPDATED_CLIENT: {
    trigger: 'BOOKING_UPDATED_CLIENT',
    category: 'SCHEDULE',
    recipientType: 'CLIENT',
    title: 'Alteração de Agendamento',
    description: 'Enviada quando o agendamento é alterado (apenas se marcado ao editar na agenda).',
    defaultWhatsappText:
      `Horário Alterado!\n\n` +
      `Olá, {client_first_name}! Seu agendamento no {business_name} foi remarcado.\n\n` +
      `Novos detalhes:\n` +
      `• Nova Data: {date}\n` +
      `• Novo Horário: {time}\n` +
      `• Serviço: {service_name}\n` +
      `• Profissional: {professional_name}\n` +
      `• Local: {location}\n\n` +
      `Qualquer dúvida, basta responder a esta mensagem. Te esperamos!`,
    defaultEmailSubject: 'Seu agendamento foi alterado — {business_name}',
    defaultEmailBody:
      `<p>Olá, <strong>{client_first_name}</strong>!</p>` +
      `<p>Seu agendamento no <strong>{business_name}</strong> foi atualizado para uma nova data/horário:</p>` +
      `<ul>` +
      `<li><strong>Nova Data:</strong> {date}</li>` +
      `<li><strong>Novo Horário:</strong> {time}</li>` +
      `<li><strong>Serviço:</strong> {service_name}</li>` +
      `<li><strong>Profissional:</strong> {professional_name}</li>` +
      `<li><strong>Local:</strong> {location}</li>` +
      `</ul>`,
    variables: [
      '{client_first_name}',
      '{client_name}',
      '{service_name}',
      '{professional_name}',
      '{date}',
      '{time}',
      '{location}',
      '{business_name}'
    ]
  },

  BOOKING_NEW_TEAM: {
    trigger: 'BOOKING_NEW_TEAM',
    category: 'TEAM',
    recipientType: 'TEAM',
    title: 'Novo Agendamento Recebido',
    description: 'Enviada para o profissional que atende e/ou dono do estúdio ao entrar agendamento.',
    defaultWhatsappText:
      `Novo Agendamento Recebido!\n\n` +
      `Um novo horário foi agendado no {business_name}:\n\n` +
      `• Cliente: {client_name}\n` +
      `• WhatsApp do Cliente: {client_phone}\n` +
      `• Serviço: {service_name}\n` +
      `• Profissional: {professional_name}\n` +
      `• Data: {date} às {time}\n` +
      `• Duração: {duration}\n` +
      `• Valor: R$ {price}\n\n` +
      `Acesse o painel para visualizar sua agenda atualizada.`,
    defaultEmailSubject: 'Novo Agendamento: {client_name} — {date} às {time}',
    defaultEmailBody:
      `<p>Novo agendamento recebido na vitrine do <strong>{business_name}</strong>:</p>` +
      `<ul>` +
      `<li><strong>Cliente:</strong> {client_name} ({client_phone})</li>` +
      `<li><strong>Serviço:</strong> {service_name}</li>` +
      `<li><strong>Profissional:</strong> {professional_name}</li>` +
      `<li><strong>Data/Horário:</strong> {date} às {time} ({duration})</li>` +
      `<li><strong>Valor:</strong> R$ {price}</li>` +
      `</ul>`,
    variables: [
      '{client_name}',
      '{client_first_name}',
      '{client_phone}',
      '{service_name}',
      '{professional_name}',
      '{date}',
      '{time}',
      '{duration}',
      '{price}',
      '{business_name}'
    ]
  },

  BOOKING_CANCELLED_CLIENT: {
    trigger: 'BOOKING_CANCELLED_CLIENT',
    category: 'SCHEDULE',
    recipientType: 'CLIENT',
    title: 'Cancelamento de Agendamento (Cliente)',
    description: 'Enviada para o cliente quando um agendamento é cancelado.',
    defaultWhatsappText:
      `Agendamento Cancelado.\n\n` +
      `Olá, {client_first_name}! Confirmamos que seu agendamento no {business_name} para o dia {date} às {time} foi cancelado.\n\n` +
      `Se desejar escolher um novo horário no futuro, acesse nossa agenda online quando preferir:\n` +
      `{booking_url}\n\n` +
      `Tenha um ótimo dia!`,
    defaultEmailSubject: 'Agendamento Cancelado — {business_name}',
    defaultEmailBody:
      `<p>Olá, <strong>{client_first_name}</strong>.</p>` +
      `<p>Confirmamos o cancelamento do seu agendamento para <strong>{service_name}</strong> no dia <strong>{date} às {time}</strong>.</p>` +
      `<p>Quando quiser agendar uma nova data, estamos à disposição.</p>`,
    variables: [
      '{client_first_name}',
      '{client_name}',
      '{service_name}',
      '{date}',
      '{time}',
      '{business_name}',
      '{booking_url}'
    ]
  },

  BOOKING_CANCELLED_TEAM: {
    trigger: 'BOOKING_CANCELLED_TEAM',
    category: 'TEAM',
    recipientType: 'TEAM',
    title: 'Agendamento Cancelado (Equipe)',
    description: 'Enviada para o profissional e/ou administrador quando um agendamento é cancelado.',
    defaultWhatsappText:
      `Aviso: Agendamento Cancelado.\n\n` +
      `O agendamento a seguir foi cancelado no {business_name}:\n\n` +
      `• Cliente: {client_name}\n` +
      `• Serviço: {service_name}\n` +
      `• Profissional: {professional_name}\n` +
      `• Data: {date} às {time}\n\n` +
      `O horário está novamente liberado na agenda.`,
    defaultEmailSubject: 'Horário Cancelado: {client_name} ({date} às {time})',
    defaultEmailBody:
      `<p>O agendamento de <strong>{client_name}</strong> ({service_name} com {professional_name}) para o dia <strong>{date} às {time}</strong> foi cancelado.</p>` +
      `<p>O horário foi liberado automaticamente na agenda.</p>`,
    variables: [
      '{client_name}',
      '{service_name}',
      '{professional_name}',
      '{date}',
      '{time}',
      '{business_name}'
    ]
  },

  NO_SHOW_CLIENT: {
    trigger: 'NO_SHOW_CLIENT',
    category: 'SCHEDULE',
    recipientType: 'CLIENT',
    title: 'Falta / Não Comparecimento (No-Show)',
    description: 'Enviada de forma acolhedora quando o cliente não comparece ao horário marcado.',
    defaultWhatsappText:
      `Sentimos sua falta hoje no {business_name}.\n\n` +
      `Olá, {client_first_name}! Percebemos que você não conseguiu comparecer ao seu horário às {time}. Esperamos que esteja tudo bem!\n\n` +
      `Sabemos que imprevistos acontecem. Quando puder remarcar seu momento conosco, acesse nossa agenda pelo link:\n` +
      `{booking_url}\n\n` +
      `Tenha uma ótima semana!`,
    defaultEmailSubject: 'Sentimos sua falta hoje — {business_name}',
    defaultEmailBody:
      `<p>Olá, <strong>{client_first_name}</strong>.</p>` +
      `<p>Sentimos sua falta hoje no <strong>{business_name}</strong>. Esperamos que esteja tudo bem com você!</p>` +
      `<p>Caso queira remarcar seu atendimento, acesse nosso link de agendamento online.</p>`,
    variables: ['{client_first_name}', '{client_name}', '{date}', '{time}', '{business_name}', '{booking_url}']
  },

  POST_SERVICE_FOLLOWUP_30D: {
    trigger: 'POST_SERVICE_FOLLOWUP_30D',
    category: 'POST_SERVICE',
    recipientType: 'CLIENT',
    title: 'Acompanhamento Pós-Agendamento (30 dias)',
    description: 'Enviada 30 dias após o último atendimento para incentivar retorno.',
    defaultWhatsappText:
      `Já faz um mês desde seu último cuidado no {business_name}!\n\n` +
      `Olá, {client_first_name}! Tudo bem? Já se passaram 30 dias desde seu atendimento de {service_name}.\n\n` +
      `Para manter seus resultados e seu bem-estar sempre em dia, que tal já garantir seu próximo horário?\n\n` +
      `Escolha o melhor dia e horário por aqui:\n` +
      `{booking_url}\n\n` +
      `Estamos te esperando com muito carinho!`,
    defaultEmailSubject: 'Como está seu cuidado? Já faz 30 dias — {business_name}',
    defaultEmailBody:
      `<p>Olá, <strong>{client_first_name}</strong>!</p>` +
      `<p>Já se passaram 30 dias desde seu último atendimento no <strong>{business_name}</strong>.</p>` +
      `<p>Para manter seus cuidados em dia, venha nos visitar novamente!</p>`,
    variables: ['{client_first_name}', '{client_name}', '{service_name}', '{business_name}', '{booking_url}']
  },

  NPS_GOOGLE_REVIEW: {
    trigger: 'NPS_GOOGLE_REVIEW',
    category: 'POST_SERVICE',
    recipientType: 'CLIENT',
    title: 'Agradecimento + Avaliação Google & NPS',
    description: 'Enviada pós-atendimento solicitando feedback e nota no Google Maps.',
    defaultWhatsappText:
      `Obrigado pela sua visita no {business_name}!\n\n` +
      `Olá, {client_first_name}! Foi um imenso prazer cuidar de você hoje.\n\n` +
      `Sua opinião é fundamental para nossa equipe. Poderia nos avaliar com 5 estrelas no Google? Leva menos de 1 minuto:\n` +
      `{google_review_url}\n\n` +
      `Agradecemos de coração pela confiança!`,
    defaultEmailSubject: 'Como foi sua experiência no {business_name}?',
    defaultEmailBody:
      `<p>Olá, <strong>{client_first_name}</strong>!</p>` +
      `<p>Agradecemos pela sua visita ao <strong>{business_name}</strong>.</p>` +
      `<p>Se gostou do atendimento, deixe uma avaliação para nossa equipe no Google:</p>` +
      `<p><a href="{google_review_url}">{google_review_url}</a></p>`,
    variables: ['{client_first_name}', '{client_name}', '{service_name}', '{business_name}', '{google_review_url}']
  },

  BIRTHDAY_CLIENT: {
    trigger: 'BIRTHDAY_CLIENT',
    category: 'POST_SERVICE',
    recipientType: 'CLIENT',
    title: 'Felicitações de Aniversário',
    description: 'Enviada no dia do aniversário do cliente com mensagem de parabéns e mimo.',
    defaultWhatsappText:
      `Parabéns pelo seu dia especial, {client_first_name}!\n\n` +
      `Toda a equipe do {business_name} deseja a você um novo ciclo repleto de saúde, realizações e muita luz!\n\n` +
      `Para comemorar, preparamos um presente especial para você agendar seu cuidado conosco este mês.\n\n` +
      `Venha comemorar com a gente! Agende seu horário:\n` +
      `{booking_url}`,
    defaultEmailSubject: 'Feliz Aniversário! Um presente para você — {business_name}',
    defaultEmailBody:
      `<p>Parabéns pelo seu dia, <strong>{client_first_name}</strong>!</p>` +
      `<p>Desejamos a você muitas felicidades e realizações. Venha comemorar conosco no <strong>{business_name}</strong>!</p>`,
    variables: ['{client_first_name}', '{client_name}', '{business_name}', '{booking_url}']
  },

  WAITLIST_JOINED: {
    trigger: 'WAITLIST_JOINED',
    category: 'WAITLIST',
    recipientType: 'CLIENT',
    title: 'Entrada na Fila Online (Lista de Espera)',
    description: 'Enviada quando o cliente entra na lista de espera para uma data sem vagas.',
    defaultWhatsappText:
      `Você está na Lista de Espera do {business_name}!\n\n` +
      `Olá, {client_first_name}! Registramos seu interesse para atendimento no dia {date}.\n\n` +
      `Assim que surgir qualquer desistência ou abertura de vaga nesse dia, avisaremos você imediatamente por aqui com prioridade.\n\n` +
      `Obrigado pela preferência e paciência!`,
    defaultEmailSubject: 'Você está na Lista de Espera — {business_name}',
    defaultEmailBody:
      `<p>Olá, <strong>{client_first_name}</strong>!</p>` +
      `<p>Seu nome está registrado na lista de espera do <strong>{business_name}</strong> para o dia <strong>{date}</strong>.</p>` +
      `<p>Assim que uma vaga for liberada, você receberá um aviso imediato.</p>`,
    variables: ['{client_first_name}', '{client_name}', '{date}', '{service_name}', '{business_name}']
  },

  WAITLIST_CALLED: {
    trigger: 'WAITLIST_CALLED',
    category: 'WAITLIST',
    recipientType: 'CLIENT',
    title: 'Chamada na Fila Online (Vaga Liberada)',
    description: 'Enviada quando surge desistência e o horário é ofertado ao cliente da fila.',
    defaultWhatsappText:
      `Uma vaga acabou de abrir no {business_name}!\n\n` +
      `Olá, {client_first_name}! Uma vaga foi liberada para o dia {date} às {time} com {professional_name}.\n\n` +
      `Como você estava na nossa lista de espera, esse horário está reservado para você pelos próximos 10 minutos.\n\n` +
      `Responda SIM agora para confirmar seu atendimento e garantir sua vaga!`,
    defaultEmailSubject: 'Vaga liberada para você! — {business_name}',
    defaultEmailBody:
      `<p>Olá, <strong>{client_first_name}</strong>!</p>` +
      `<p>Uma vaga abriu no <strong>{business_name}</strong> para o dia <strong>{date} às {time}</strong>.</p>` +
      `<p>Confirme respondendo o WhatsApp dentro do prazo de 10 minutos para garantir o horário.</p>`,
    variables: ['{client_first_name}', '{client_name}', '{date}', '{time}', '{professional_name}', '{business_name}']
  },

  PAYMENT_PIX_DEPOSIT: {
    trigger: 'PAYMENT_PIX_DEPOSIT',
    category: 'FINANCIAL',
    recipientType: 'CLIENT',
    title: 'Cobrança de Sinal PIX (No-Show Shield)',
    description: 'Enviada para agendamentos que exigem reserva financeira antecipada.',
    defaultWhatsappText:
      `Reserva de Agendamento — {business_name}\n\n` +
      `Olá, {client_first_name}! Para confirmar seu agendamento no dia {date} às {time}, é necessário o pagamento do sinal de garantia.\n\n` +
      `• Valor do sinal: R$ {deposit_amount}\n` +
      `• Serviço: {service_name}\n\n` +
      `Acesse o link seguro abaixo para gerar o PIX:\n` +
      `{pix_link}\n\n` +
      `Após o pagamento, o valor é automaticamente abatido do total do seu atendimento.`,
    defaultEmailSubject: 'Confirmação com Sinal PIX — {business_name}',
    defaultEmailBody:
      `<p>Olá, <strong>{client_first_name}</strong>.</p>` +
      `<p>Para confirmar seu agendamento em <strong>{date} às {time}</strong>, realize o pagamento do sinal de <strong>R$ {deposit_amount}</strong> através do link:</p>` +
      `<p><a href="{pix_link}">{pix_link}</a></p>`,
    variables: ['{client_first_name}', '{client_name}', '{date}', '{time}', '{service_name}', '{deposit_amount}', '{pix_link}', '{business_name}']
  },

  PAYMENT_CONFIRMED: {
    trigger: 'PAYMENT_CONFIRMED',
    category: 'FINANCIAL',
    recipientType: 'CLIENT',
    title: 'Confirmação de Pagamento do Sinal',
    description: 'Enviada assim que o webhook do Asaas acusa recebimento do PIX.',
    defaultWhatsappText:
      `Pagamento Confirmado com Sucesso!\n\n` +
      `Olá, {client_first_name}! Recebemos a confirmação do seu sinal de R$ {deposit_amount}.\n\n` +
      `Seu horário no {business_name} está 100% garantido para o dia {date} às {time}.\n\n` +
      `Te esperamos com tudo pronto para o seu atendimento!`,
    defaultEmailSubject: 'Pagamento de Sinal Confirmado — {business_name}',
    defaultEmailBody:
      `<p>Olá, <strong>{client_first_name}</strong>!</p>` +
      `<p>Recebemos o pagamento do seu sinal no valor de <strong>R$ {deposit_amount}</strong>.</p>` +
      `<p>Seu horário no dia <strong>{date} às {time}</strong> está totalmente confirmado.</p>`,
    variables: ['{client_first_name}', '{client_name}', '{date}', '{time}', '{deposit_amount}', '{business_name}']
  },

  COURSE_NEW_BROADCAST: {
    trigger: 'COURSE_NEW_BROADCAST',
    category: 'COURSES',
    recipientType: 'STUDENT',
    title: 'Divulgação de Novo Curso',
    description: 'Enviada para alunas e clientes selecionadas quando um novo curso é publicado.',
    defaultWhatsappText:
      `Novo Curso Disponível no {business_name}!\n\n` +
      `Olá, {client_first_name}! Temos uma novidade imperdível para você:\n` +
      `Acabamos de abrir as inscrições para o curso "{course_title}"!\n\n` +
      `{course_description}\n` +
      `• Carga horária: {course_duration}\n` +
      `• Investimento: R$ {course_price}\n\n` +
      `Garanta sua vaga antes que esgote pelo link:\n` +
      `{course_enroll_url}\n\n` +
      `Qualquer dúvida, estamos à disposição por aqui!`,
    defaultEmailSubject: 'Novo Curso: {course_title} — {business_name}',
    defaultEmailBody:
      `<p>Olá, <strong>{client_first_name}</strong>!</p>` +
      `<p>Lançamos um novo curso no <strong>{business_name}</strong>: <strong>{course_title}</strong>.</p>` +
      `<p>{course_description}</p>` +
      `<p>Valor: R$ {course_price} | Carga Horária: {course_duration}</p>` +
      `<p><a href="{course_enroll_url}">Clique aqui para garantir sua vaga</a></p>`,
    variables: [
      '{client_first_name}',
      '{client_name}',
      '{course_title}',
      '{course_description}',
      '{course_price}',
      '{course_duration}',
      '{course_enroll_url}',
      '{business_name}'
    ]
  },

  COURSE_ACCESS_GRANTED: {
    trigger: 'COURSE_ACCESS_GRANTED',
    category: 'COURSES',
    recipientType: 'STUDENT',
    title: 'Liberação de Acesso ao Curso',
    description: 'Enviada quando a aluna é matriculada para receber o link de acesso às aulas.',
    defaultWhatsappText:
      `Seu acesso ao curso foi liberado!\n\n` +
      `Olá, {client_first_name}! Seja muito bem-vinda ao curso "{course_title}" no {business_name}!\n\n` +
      `Você já pode assistir às aulas pelo seu celular ou computador através do link exclusivo:\n` +
      `{course_access_url}\n\n` +
      `Desejamos ótimos estudos! Conte conosco na sua jornada de aprendizado.`,
    defaultEmailSubject: 'Acesso Liberado: Curso {course_title}',
    defaultEmailBody:
      `<p>Olá, <strong>{client_first_name}</strong>!</p>` +
      `<p>Seu acesso ao curso <strong>{course_title}</strong> no <strong>{business_name}</strong> foi liberado com sucesso.</p>` +
      `<p><a href="{course_access_url}">Clique aqui para acessar suas aulas</a></p>`,
    variables: [
      '{client_first_name}',
      '{client_name}',
      '{course_title}',
      '{course_access_url}',
      '{business_name}'
    ]
  },

  COUPON_CAMPAIGN: {
    trigger: 'COUPON_CAMPAIGN',
    category: 'MARKETING',
    recipientType: 'CLIENT',
    title: 'Campanha de Cupom de Desconto',
    description: 'Enviada para as clientes selecionadas no painel com cupom e link de agendamento.',
    defaultWhatsappText:
      `Presente Especial do {business_name}!\n\n` +
      `Olá, {client_first_name}! Preparamos um cupom exclusivo para você cuidar de você esta semana:\n\n` +
      `• Cupom: {coupon_code}\n` +
      `• Benefício: {coupon_discount}\n` +
      `• Válido até: {coupon_valid_until}\n\n` +
      `Aproveite para garantir seu horário agora mesmo pelo link:\n` +
      `{booking_url}\n\n` +
      `Esperamos você com muito carinho!`,
    defaultEmailSubject: 'Presente para você: Cupom {coupon_code} no {business_name}',
    defaultEmailBody:
      `<p>Olá, <strong>{client_first_name}</strong>!</p>` +
      `<p>Preparamos um cupom exclusivo para sua próxima visita ao <strong>{business_name}</strong>:</p>` +
      `<p><strong>Cupom:</strong> {coupon_code} ({coupon_discount})</p>` +
      `<p>Válido até: {coupon_valid_until}</p>` +
      `<p><a href="{booking_url}">Agende seu horário aqui</a></p>`,
    variables: [
      '{client_first_name}',
      '{client_name}',
      '{coupon_code}',
      '{coupon_discount}',
      '{coupon_valid_until}',
      '{business_name}',
      '{booking_url}'
    ]
  }
};

export class WhatsappTemplateEngine {
  /**
   * Substitui todas as tags {variavel} no texto pelos valores fornecidos.
   */
  public static render(template: string, data: Record<string, any>): string {
    if (!template) return '';
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      const val = data[key];
      if (val !== undefined && val !== null) {
        return String(val);
      }
      return match;
    });
  }

  /**
   * Retorna os metadados oficiais de um trigger.
   */
  public static getMetadata(trigger: NotificationTrigger): TemplateMetadata {
    return OFFICIAL_TEMPLATES[trigger];
  }

  /**
   * Retorna todos os templates cadastrados no sistema.
   */
  public static getAllTemplates(): TemplateMetadata[] {
    return Object.values(OFFICIAL_TEMPLATES);
  }
}
