import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { NotificationCategory, NotificationPriority, TransactionType, PaymentMethod } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { NotificationsService } from '../notifications/notifications.service';

const productInputSchema = z.object({
  name: z.string().min(2, 'O nome do produto é obrigatório.'),
  category: z.string().default('Geral'),
  description: z.string().optional().nullable(),
  costPrice: z.number().min(0).default(0),
  salePrice: z.number().positive('O preço de venda deve ser maior que zero.'),
  stockQuantity: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(0),
  minStockAlert: z.number().int().min(0).optional(),
  barcode: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  showInVitrine: z.boolean().default(true),
  isActive: z.boolean().default(true)
});

async function verifyPlanAllowsProducts(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true }
  });
  if (!tenant || !tenant.plan) return false;
  return tenant.plan.code !== 'FREE' || Number(tenant.plan.monthlyPrice) > 0;
}

export const productsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);
  const db = prisma as any;

  // GET /products - Listar produtos do estoque do salão
  app.get('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const products = await db.product.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }
    });

    const formatted = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description || '',
      brand: 'Própria',
      costPrice: Number(p.costPrice),
      salePrice: Number(p.salePrice),
      stockQuantity: p.stockQuantity,
      minStockAlert: p.minStock,
      barcode: p.barcode || undefined,
      sku: p.barcode || undefined,
      imageUrl: p.imageUrl || undefined,
      showInVitrine: p.showInVitrine,
      isActive: p.isActive
    }));

    return reply.send(formatted);
  });

  // POST /products - Cadastrar novo produto
  app.post('/', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const allowsProducts = await verifyPlanAllowsProducts(tenantId);
    if (!allowsProducts) {
      return reply.status(403).send({
        error: 'Recurso Bloqueado',
        message: 'O módulo de Produtos e Estoque está disponível nos planos pagos (Solo ou Equipe Pro). Faça upgrade para desbloquear.'
      });
    }

    const data = productInputSchema.parse(request.body);

    const createData: any = {
      tenantId,
      name: data.name,
      category: data.category,
      description: data.description || null,
      costPrice: data.costPrice,
      salePrice: data.salePrice,
      stockQuantity: data.stockQuantity,
      minStock: data.minStockAlert !== undefined ? data.minStockAlert : data.minStock,
      barcode: data.sku || data.barcode || null,
      imageUrl: data.imageUrl || null,
      showInVitrine: data.showInVitrine,
      isActive: data.isActive
    };

    const product = await db.product.create({
      data: createData
    });

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        tenantId,
        action: 'PRODUCT_CREATE',
        entityType: 'Product',
        entityId: product.id,
        details: { name: product.name, salePrice: Number(product.salePrice), stock: product.stockQuantity },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      }
    }).catch(() => null);

    return reply.status(201).send({
      ...product,
      costPrice: Number(product.costPrice),
      salePrice: Number(product.salePrice),
      minStockAlert: product.minStock,
      sku: product.barcode || undefined
    });
  });

  // PUT /products/:id - Atualizar produto
  app.put('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const allowsProducts = await verifyPlanAllowsProducts(tenantId);
    if (!allowsProducts) {
      return reply.status(403).send({
        error: 'Recurso Bloqueado',
        message: 'O módulo de Produtos e Estoque está disponível nos planos pagos (Solo ou Equipe Pro). Faça upgrade para desbloquear.'
      });
    }

    const { id } = request.params as { id: string };
    const data = productInputSchema.partial().parse(request.body);

    const updateData: any = {
      ...(data.name && { name: data.name }),
      ...(data.category && { category: data.category }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
      ...(data.salePrice !== undefined && { salePrice: data.salePrice }),
      ...(data.stockQuantity !== undefined && { stockQuantity: data.stockQuantity }),
      ...(data.minStock !== undefined && { minStock: data.minStock }),
      ...(data.minStockAlert !== undefined && { minStock: data.minStockAlert }),
      ...(data.sku !== undefined && { barcode: data.sku || null }),
      ...(data.barcode !== undefined && { barcode: data.barcode || null }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
      ...(data.showInVitrine !== undefined && { showInVitrine: data.showInVitrine }),
      ...(data.isActive !== undefined && { isActive: data.isActive })
    };

    const product = await db.product.updateMany({
      where: { id, tenantId },
      data: updateData
    });

    if (product.count === 0) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Produto não localizado.' });
    }

    const updated = await db.product.findUnique({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        tenantId,
        action: 'PRODUCT_UPDATE',
        entityType: 'Product',
        entityId: id,
        details: { changes: updateData },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      }
    }).catch(() => null);

    if (updated) {
      try {
        if (updated.stockQuantity === 0) {
          await NotificationsService.create({
            tenantId,
            category: NotificationCategory.PRODUCT,
            priority: NotificationPriority.HIGH,
            title: 'Estoque Esgotado',
            message: `O produto "${updated.name}" está com estoque totalmente zerado!`,
            link: '/dashboard/produtos',
            metadata: { productId: updated.id }
          });
        } else if (updated.minStock && updated.stockQuantity <= updated.minStock) {
          await NotificationsService.create({
            tenantId,
            category: NotificationCategory.PRODUCT,
            priority: NotificationPriority.MEDIUM,
            title: 'Alerta de Estoque Baixo',
            message: `O produto "${updated.name}" tem apenas ${updated.stockQuantity} unidades restantes (mínimo: ${updated.minStock}).`,
            link: '/dashboard/produtos',
            metadata: { productId: updated.id }
          });
        }
      } catch (err) {
        console.error('Erro ao registrar notificação de estoque:', err);
      }
    }

    return reply.send(updated);
  });

  // DELETE /products/:id - Excluir produto
  app.delete('/:id', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const allowsProducts = await verifyPlanAllowsProducts(tenantId);
    if (!allowsProducts) {
      return reply.status(403).send({
        error: 'Recurso Bloqueado',
        message: 'O módulo de Produtos e Estoque está disponível nos planos pagos (Solo ou Equipe Pro). Faça upgrade para desbloquear.'
      });
    }

    const { id } = request.params as { id: string };

    const product = await db.product.findFirst({
      where: { id, tenantId }
    });

    if (!product) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Produto não localizado.' });
    }

    await db.product.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        tenantId,
        action: 'PRODUCT_DELETE',
        entityType: 'Product',
        entityId: id,
        details: { name: product.name },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      }
    }).catch(() => null);

    return reply.send({ message: 'Produto excluído do estoque com sucesso.' });
  });

  // POST /products/sell - Venda expressa de balcão (PDV sem agendamento)
  app.post('/sell', async (request, reply) => {
    const tenantId = request.user.tenantId;
    if (!tenantId) {
      return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
    }

    const sellSchema = z.object({
      items: z.array(z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive('Quantidade deve ser pelo menos 1.'),
        unitPrice: z.number().min(0)
      })).min(1, 'Selecione pelo menos um produto para venda.'),
      paymentMethod: z.enum(['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH']).default('PIX'),
      clientId: z.string().uuid().optional().nullable(),
      clientName: z.string().optional().nullable(),
      discount: z.number().min(0).default(0),
      notes: z.string().optional().nullable()
    });

    const data = sellSchema.parse(request.body);

    const productIds = data.items.map((i) => i.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds }, tenantId }
    });

    if (products.length !== productIds.length) {
      return reply.status(400).send({
        error: 'Produtos Inválidos',
        message: 'Um ou mais produtos selecionados não pertencem ao catálogo deste estabelecimento.'
      });
    }

    // Valida estoque de cada produto
    for (const item of data.items) {
      const p = products.find((prod: any) => prod.id === item.productId);
      if (!p) continue;
      if (p.stockQuantity < item.quantity) {
        return reply.status(400).send({
          error: 'Estoque Insuficiente',
          message: `Estoque insuficiente para o produto "${p.name}". Disponível: ${p.stockQuantity}, Solicitado: ${item.quantity}.`
        });
      }
    }

    let grossTotal = 0;
    let totalCmv = 0;
    const soldProductNames: string[] = [];

    for (const item of data.items) {
      const p = products.find((prod: any) => prod.id === item.productId);
      grossTotal += item.unitPrice * item.quantity;
      if (p) {
        totalCmv += Number(p.costPrice || 0) * item.quantity;
        soldProductNames.push(`${item.quantity}x ${p.name}`);
      }
    }

    const netTotal = Math.max(0, grossTotal - (data.discount || 0));

    const result = await prisma.$transaction(async (tx) => {
      // 1. Dá baixa de estoque
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { decrement: item.quantity }
          }
        });
      }

      // 2. Lança receita no fluxo financeiro
      const clientLabel = data.clientName ? ` (${data.clientName})` : '';
      const summaryText = soldProductNames.join(', ');
      const entry = await tx.financialEntry.create({
        data: {
          tenantId,
          type: TransactionType.INCOME,
          amount: netTotal,
          description: `Venda Balcão (PDV): ${summaryText}${clientLabel}`,
          paymentMethod: data.paymentMethod as PaymentMethod,
          paidAt: new Date()
        }
      });

      return { entry, netTotal, grossTotal, totalCmv };
    });

    // 3. Dispara alerta para produtos cujo estoque ficou baixo
    try {
      for (const item of data.items) {
        const p = products.find((prod: any) => prod.id === item.productId);
        if (p && p.stockQuantity - item.quantity <= p.minStock) {
          await NotificationsService.create({
            tenantId,
            category: NotificationCategory.PRODUCT,
            priority: NotificationPriority.HIGH,
            title: 'Alerta de Estoque Baixo',
            message: `O produto "${p.name}" atingiu nível crítico (${p.stockQuantity - item.quantity} un restantes). Reponha seu estoque.`,
            link: '/dashboard/produtos',
            metadata: { productId: p.id }
          });
        }
      }
    } catch (notifErr) {
      console.error('Erro ao emitir alerta de estoque pós-venda:', notifErr);
    }

    // 4. Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: request.user.sub,
        tenantId,
        action: 'PRODUCT_POS_SALE',
        entityType: 'FinancialEntry',
        entityId: result.entry.id,
        details: {
          itemsCount: data.items.length,
          netTotal: result.netTotal,
          totalCmv: result.totalCmv,
          paymentMethod: data.paymentMethod
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      }
    }).catch(() => null);

    return reply.status(201).send({
      success: true,
      financialEntryId: result.entry.id,
      netTotal: result.netTotal,
      grossTotal: result.grossTotal,
      totalCmv: result.totalCmv,
      message: 'Venda de balcão concluída com sucesso!'
    });
  });
};
