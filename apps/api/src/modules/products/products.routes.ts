import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { NotificationCategory, NotificationPriority } from '@prisma/client';
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

    const { id } = request.params as { id: string };

    const product = await db.product.findFirst({
      where: { id, tenantId }
    });

    if (!product) {
      return reply.status(404).send({ error: 'Não encontrado', message: 'Produto não localizado.' });
    }

    await db.product.delete({ where: { id } });

    return reply.send({ message: 'Produto excluído do estoque com sucesso.' });
  });
};
