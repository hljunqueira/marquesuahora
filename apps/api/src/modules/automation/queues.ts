import { Queue } from 'bullmq';
import { redis } from '../../lib/redis';

// Configurações das Filas BullMQ
export const whatsappQueue = new Queue('whatsapp-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 500
  }
});

export const birthdayQueue = new Queue('birthday-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000
    },
    removeOnComplete: 50,
    removeOnFail: 200
  }
});

export const waitlistQueue = new Queue('waitlist-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 3000
    },
    removeOnComplete: 100,
    removeOnFail: 200
  }
});

export const npsQueue = new Queue('nps-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000
    },
    removeOnComplete: 100,
    removeOnFail: 500
  }
});

export const churnQueue = new Queue('churn-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 15000
    },
    removeOnComplete: 50,
    removeOnFail: 200
  }
});
