export * from './queues';
export * from './evolution.service';
export * from './jev.service';
export * from './openrouter.service';
export * from './webhook.routes';
export * from './workers/whatsapp.worker';

export * from './workers/birthday.worker';
export * from './workers/waitlist.worker';
export * from './workers/nps.worker';
export * from './workers/churn.worker';
export * from './schedulers/reminder-24h.scheduler';

import { Reminder24hScheduler } from './schedulers/reminder-24h.scheduler';

// Inicializa o scheduler de lembretes automáticos de 24h
if (process.env.NODE_ENV !== 'test') {
  Reminder24hScheduler.start();
}

