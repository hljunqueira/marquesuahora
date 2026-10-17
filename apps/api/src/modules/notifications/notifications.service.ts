import { NotificationCategory, NotificationPriority } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface CreateNotificationInput {
  tenantId: string;
  userId?: string | null;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message: string;
  link?: string | null;
  metadata?: any;
}

export interface ListNotificationsOptions {
  category?: NotificationCategory | 'ALL';
  read?: boolean;
  limit?: number;
  offset?: number;
}

export class NotificationsService {
  /**
   * Cria uma notificação no banco de dados
   */
  static async create(input: CreateNotificationInput) {
    const db = prisma as any;
    return await db.notification.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        category: input.category,
        priority: input.priority ?? NotificationPriority.MEDIUM,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
        metadata: input.metadata ?? undefined,
        read: false
      }
    });
  }

  /**
   * Lista notificações com filtros de categoria, lida/não lida e paginação
   */
  static async list(tenantId: string, options: ListNotificationsOptions = {}) {
    const db = prisma as any;
    const { category, read, limit = 50, offset = 0 } = options;

    const where: any = { tenantId };

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (typeof read === 'boolean') {
      where.read = read;
    }

    const [items, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      db.notification.count({ where })
    ]);

    return {
      items,
      total,
      limit,
      offset
    };
  }

  /**
   * Resumo de contagem de notificações não lidas totais e por categoria
   */
  static async getSummary(tenantId: string) {
    const db = prisma as any;

    const [unreadTotal, unreadSchedule, unreadProduct, unreadCourse, unreadSystem] = await Promise.all([
      db.notification.count({ where: { tenantId, read: false } }),
      db.notification.count({ where: { tenantId, read: false, category: NotificationCategory.SCHEDULE } }),
      db.notification.count({ where: { tenantId, read: false, category: NotificationCategory.PRODUCT } }),
      db.notification.count({ where: { tenantId, read: false, category: NotificationCategory.COURSE } }),
      db.notification.count({ where: { tenantId, read: false, category: NotificationCategory.SYSTEM } })
    ]);

    return {
      unreadTotal,
      byCategory: {
        SCHEDULE: unreadSchedule,
        PRODUCT: unreadProduct,
        COURSE: unreadCourse,
        SYSTEM: unreadSystem
      }
    };
  }

  /**
   * Marca uma notificação específica como lida
   */
  static async markAsRead(tenantId: string, id: string) {
    const db = prisma as any;
    const notification = await db.notification.findFirst({
      where: { id, tenantId }
    });

    if (!notification) {
      return null;
    }

    return await db.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date()
      }
    });
  }

  /**
   * Marca todas as notificações do tenant (ou de uma categoria) como lidas
   */
  static async markAllAsRead(tenantId: string, category?: NotificationCategory) {
    const db = prisma as any;
    const where: any = { tenantId, read: false };
    if (category) {
      where.category = category;
    }

    return await db.notification.updateMany({
      where,
      data: {
        read: true,
        readAt: new Date()
      }
    });
  }

  /**
   * Deleta uma notificação
   */
  static async delete(tenantId: string, id: string) {
    const db = prisma as any;
    const notification = await db.notification.findFirst({
      where: { id, tenantId }
    });

    if (!notification) {
      return false;
    }

    await db.notification.delete({
      where: { id }
    });

    return true;
  }

  /**
   * Exclui todas as notificações lidas
   */
  static async deleteAllRead(tenantId: string) {
    const db = prisma as any;
    return await db.notification.deleteMany({
      where: { tenantId, read: true }
    });
  }
}
