import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { NotificationCategory, NotificationPriority } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationDispatcherService } from '../notifications/dispatcher.service';
import { EvolutionService } from '../automation/evolution.service';
import { WhatsappTemplateEngine } from '../notifications/template-engine';
import { EmailService } from '../notifications/email.service';

export const coursesRoutes: FastifyPluginAsync = async (app) => {
  // Todas as rotas de cursos exigem autenticação do tenant
  app.register(async (authScope) => {
    authScope.addHook('preHandler', app.authenticate);

    // =========================================================================
    // 1. CURSOS (CRUD)
    // =========================================================================

    // GET /courses - Listar cursos do estabelecimento
    authScope.get('/', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }

      const courses = await prisma.course.findMany({
        where: { tenantId },
        include: {
          _count: {
            select: {
              lessons: true,
              accesses: true
            }
          }
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
      });

      return reply.send(courses);
    });

    // POST /courses - Criar novo curso
    authScope.post('/', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }

      const schema = z.object({
        title: z.string().min(2, 'Título do curso é obrigatório.'),
        description: z.string().optional().nullable(),
        price: z.coerce.number().min(0).optional().nullable(),
        coverUrl: z.string().optional().nullable(),
        videoUrl: z.string().optional().nullable(),
        sortOrder: z.coerce.number().int().default(0),
        isActive: z.boolean().default(true)
      });

      const body = schema.parse(request.body);

      const course = await prisma.course.create({
        data: {
          tenantId,
          title: body.title,
          description: body.description || null,
          price: body.price !== undefined && body.price !== null ? body.price : null,
          coverUrl: body.coverUrl || null,
          videoUrl: body.videoUrl || null,
          sortOrder: body.sortOrder,
          isActive: body.isActive
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          tenantId,
          action: 'COURSE_CREATE',
          entityType: 'Course',
          entityId: course.id,
          details: { title: course.title, price: course.price },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      }).catch(() => null);

      return reply.status(201).send(course);
    });

    // GET /courses/:id - Detalhes do curso com aulas e alunas
    authScope.get('/:id', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }
      const { id } = request.params as { id: string };

      const course = await prisma.course.findFirst({
        where: { id, tenantId },
        include: {
          lessons: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
          },
          accesses: {
            include: {
              client: true
            },
            orderBy: { grantedAt: 'desc' }
          }
        }
      });

      if (!course) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Curso não encontrado.' });
      }

      return reply.send(course);
    });

    // PUT /courses/:id - Atualizar curso
    authScope.put('/:id', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }
      const { id } = request.params as { id: string };

      const existing = await prisma.course.findFirst({
        where: { id, tenantId }
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Curso não encontrado.' });
      }

      const schema = z.object({
        title: z.string().min(2).optional(),
        description: z.string().optional().nullable(),
        price: z.coerce.number().min(0).optional().nullable(),
        coverUrl: z.string().optional().nullable(),
        videoUrl: z.string().optional().nullable(),
        sortOrder: z.coerce.number().int().optional(),
        isActive: z.boolean().optional()
      });

      const body = schema.parse(request.body);

      const updated = await prisma.course.update({
        where: { id },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.price !== undefined ? { price: body.price } : {}),
          ...(body.coverUrl !== undefined ? { coverUrl: body.coverUrl } : {}),
          ...(body.videoUrl !== undefined ? { videoUrl: body.videoUrl } : {}),
          ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {})
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          tenantId,
          action: 'COURSE_UPDATE',
          entityType: 'Course',
          entityId: id,
          details: { changes: body },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      }).catch(() => null);

      return reply.send(updated);
    });

    // DELETE /courses/:id - Excluir curso
    authScope.delete('/:id', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }
      const { id } = request.params as { id: string };

      const existing = await prisma.course.findFirst({
        where: { id, tenantId }
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Curso não encontrado.' });
      }

      await prisma.course.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          tenantId,
          action: 'COURSE_DELETE',
          entityType: 'Course',
          entityId: id,
          details: { title: existing.title },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      }).catch(() => null);

      return reply.send({ success: true, message: 'Curso removido com sucesso.' });
    });

    // =========================================================================
    // 2. AULAS / LESSONS (CRUD)
    // =========================================================================

    // POST /courses/:id/lessons - Adicionar aula ao curso
    authScope.post('/:id/lessons', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }
      const { id: courseId } = request.params as { id: string };

      const course = await prisma.course.findFirst({
        where: { id: courseId, tenantId }
      });

      if (!course) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Curso não encontrado.' });
      }

      const schema = z.object({
        title: z.string().min(2, 'Título da aula é obrigatório.'),
        description: z.string().optional().nullable(),
        videoUrl: z.string().min(5, 'URL do vídeo é obrigatória.'),
        duration: z.string().optional().nullable(),
        sortOrder: z.coerce.number().int().default(0),
        isActive: z.boolean().default(true)
      });

      const body = schema.parse(request.body);

      const lesson = await prisma.courseLesson.create({
        data: {
          courseId,
          title: body.title,
          description: body.description || null,
          videoUrl: body.videoUrl,
          duration: body.duration || null,
          sortOrder: body.sortOrder,
          isActive: body.isActive
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          tenantId,
          action: 'COURSE_LESSON_CREATE',
          entityType: 'CourseLesson',
          entityId: lesson.id,
          details: { courseId, title: lesson.title },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      }).catch(() => null);

      return reply.status(201).send(lesson);
    });

    // PUT /courses/lessons/:lessonId - Atualizar aula
    authScope.put('/lessons/:lessonId', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }
      const { lessonId } = request.params as { lessonId: string };

      const lesson = await prisma.courseLesson.findUnique({
        where: { id: lessonId },
        include: { course: true }
      });

      if (!lesson || lesson.course.tenantId !== tenantId) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Aula não encontrada.' });
      }

      const schema = z.object({
        title: z.string().min(2).optional(),
        description: z.string().optional().nullable(),
        videoUrl: z.string().min(5).optional(),
        duration: z.string().optional().nullable(),
        sortOrder: z.coerce.number().int().optional(),
        isActive: z.boolean().optional()
      });

      const body = schema.parse(request.body);

      const updated = await prisma.courseLesson.update({
        where: { id: lessonId },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.videoUrl !== undefined ? { videoUrl: body.videoUrl } : {}),
          ...(body.duration !== undefined ? { duration: body.duration } : {}),
          ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {})
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          tenantId,
          action: 'COURSE_LESSON_UPDATE',
          entityType: 'CourseLesson',
          entityId: lessonId,
          details: { changes: body },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      }).catch(() => null);

      return reply.send(updated);
    });

    // DELETE /courses/lessons/:lessonId - Excluir aula
    authScope.delete('/lessons/:lessonId', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }
      const { lessonId } = request.params as { lessonId: string };

      const lesson = await prisma.courseLesson.findUnique({
        where: { id: lessonId },
        include: { course: true }
      });

      if (!lesson || lesson.course.tenantId !== tenantId) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Aula não encontrada.' });
      }

      await prisma.courseLesson.delete({ where: { id: lessonId } });

      await prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          tenantId,
          action: 'COURSE_LESSON_DELETE',
          entityType: 'CourseLesson',
          entityId: lessonId,
          details: { title: lesson.title },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      }).catch(() => null);

      return reply.send({ success: true, message: 'Aula removida com sucesso.' });
    });

    // =========================================================================
    // 3. ASSINANTES / ALUNAS (ACESSOS)
    // =========================================================================

    // GET /courses/subscribers - Listar todos os acessos/alunas das formações do tenant
    authScope.get('/subscribers', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }

      const { courseId, search } = request.query as { courseId?: string; search?: string };

      const accesses = await prisma.courseAccess.findMany({
        where: {
          course: {
            tenantId,
            ...(courseId ? { id: courseId } : {})
          },
          ...(search
            ? {
                OR: [
                  { phone: { contains: search.replace(/\D/g, '') } },
                  { client: { name: { contains: search, mode: 'insensitive' } } }
                ]
              }
            : {})
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              price: true,
              coverUrl: true
            }
          },
          client: true
        },
        orderBy: { grantedAt: 'desc' }
      });

      return reply.send(accesses);
    });

    // POST /courses/:id/access - Conceder acesso a uma aluna
    authScope.post('/:id/access', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }
      const { id: courseId } = request.params as { id: string };

      const course = await prisma.course.findFirst({
        where: { id: courseId, tenantId }
      });

      if (!course) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Curso não encontrado.' });
      }

      const schema = z.object({
        clientName: z.string().min(2, 'Nome da aluna é obrigatório.'),
        phone: z.string().min(10, 'Telefone com DDD é obrigatório.')
      });

      const body = schema.parse(request.body);
      const cleanPhone = body.phone.replace(/\D/g, '');

      // Localiza ou cria cliente no salão
      let client = await prisma.client.findUnique({
        where: {
          tenantId_phone: {
            tenantId,
            phone: cleanPhone
          }
        }
      });

      if (!client) {
        client = await prisma.client.create({
          data: {
            tenantId,
            name: body.clientName.trim(),
            phone: cleanPhone
          }
        });
      }

      // Concede ou reativa acesso
      const access = await prisma.courseAccess.upsert({
        where: {
          courseId_phone: {
            courseId,
            phone: cleanPhone
          }
        },
        create: {
          courseId,
          clientId: client.id,
          phone: cleanPhone,
          isActive: true
        },
        update: {
          clientId: client.id,
          isActive: true,
          revokedAt: null
        },
        include: {
          course: true,
          client: true
        }
      });

      try {
        await NotificationsService.create({
          tenantId,
          category: NotificationCategory.COURSE,
          priority: NotificationPriority.MEDIUM,
          title: 'Nova Matrícula em Curso',
          message: `${client.name} foi matriculada no curso "${course.title}".`,
          link: '/dashboard/cursos',
          metadata: {
            courseId: course.id,
            clientId: client.id,
            accessId: access.id
          }
        });

        // Notifica Aluna via WhatsApp e E-mail com link de acesso
        const clientFirstName = client.name.trim().split(' ')[0] || client.name;
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
        const courseAccessUrl = `https://marquesuahora.com.br/${tenant?.slug || 'curso'}/aluna`;

        await NotificationDispatcherService.dispatch({
          tenantId,
          trigger: 'COURSE_ACCESS_GRANTED',
          data: {
            clientName: client.name,
            clientFirstName,
            clientPhone: cleanPhone,
            clientEmail: (client as any)?.email,
            courseTitle: course.title,
            courseAccessUrl
          }
        });
      } catch (notifErr) {
        console.error('Erro ao registrar notificação de aluna no curso:', notifErr);
      }

      await prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          tenantId,
          action: 'COURSE_ACCESS_GRANT',
          entityType: 'CourseAccess',
          entityId: access.id,
          details: { courseId, clientName: client.name, phone: cleanPhone },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      }).catch(() => null);

      return reply.status(201).send(access);
    });

    // PATCH /courses/access/:accessId/toggle - Alternar status de acesso da aluna
    authScope.patch('/access/:accessId/toggle', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }
      const { accessId } = request.params as { accessId: string };

      const access = await prisma.courseAccess.findUnique({
        where: { id: accessId },
        include: { course: true }
      });

      if (!access || access.course.tenantId !== tenantId) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Acesso não encontrado.' });
      }

      const newStatus = !access.isActive;

      const updated = await prisma.courseAccess.update({
        where: { id: accessId },
        data: {
          isActive: newStatus,
          revokedAt: newStatus ? null : new Date()
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          tenantId,
          action: 'COURSE_ACCESS_TOGGLE',
          entityType: 'CourseAccess',
          entityId: accessId,
          details: { isActive: newStatus, courseId: access.courseId, phone: access.phone },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      }).catch(() => null);

      return reply.send(updated);
    });

    // DELETE /courses/access/:accessId - Revogar/excluir acesso
    authScope.delete('/access/:accessId', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }
      const { accessId } = request.params as { accessId: string };

      const access = await prisma.courseAccess.findUnique({
        where: { id: accessId },
        include: { course: true }
      });

      if (!access || access.course.tenantId !== tenantId) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Acesso não encontrado.' });
      }

      await prisma.courseAccess.delete({ where: { id: accessId } });

      await prisma.auditLog.create({
        data: {
          userId: request.user.sub,
          tenantId,
          action: 'COURSE_ACCESS_REVOKE',
          entityType: 'CourseAccess',
          entityId: accessId,
          details: { courseId: access.courseId, phone: access.phone },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      }).catch(() => null);

      return reply.send({ success: true, message: 'Acesso revogado com sucesso.' });
    });

    // POST /courses/:id/broadcast - Divulgar curso para a base de clientes no WhatsApp com Anti-Ban
    authScope.post('/:id/broadcast', async (request, reply) => {
      const tenantId = request.user.tenantId;
      if (!tenantId) {
        return reply.status(403).send({ error: 'Proibido', message: 'Sem estabelecimento vinculado.' });
      }
      const { id: courseId } = request.params as { id: string };

      const [course, tenant] = await Promise.all([
        prisma.course.findFirst({ where: { id: courseId, tenantId } }),
        prisma.tenant.findUnique({ where: { id: tenantId } })
      ]);

      if (!course) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Curso não encontrado.' });
      }
      if (!tenant) {
        return reply.status(404).send({ error: 'Não encontrado', message: 'Tenant não encontrado.' });
      }

      const broadcastSchema = z.object({
        audienceFilter: z.enum(['ALL', 'CUSTOM']).default('ALL'),
        clientIds: z.array(z.string().uuid()).optional().default([])
      });

      const { audienceFilter, clientIds } = broadcastSchema.parse(request.body || {});

      let targetClients: { id: string; name: string; phone: string; email: string | null }[] = [];
      if (audienceFilter === 'CUSTOM' && clientIds.length > 0) {
        targetClients = await prisma.client.findMany({
          where: { tenantId, id: { in: clientIds }, OR: [{ phone: { not: '' } }, { email: { not: '' } }] },
          select: { id: true, name: true, phone: true, email: true }
        });
      } else {
        targetClients = await prisma.client.findMany({
          where: { tenantId, OR: [{ phone: { not: '' } }, { email: { not: '' } }] },
          select: { id: true, name: true, phone: true, email: true }
        });
      }

      if (targetClients.length === 0) {
        return reply.status(400).send({
          error: 'Audiência Vazia',
          message: 'Nenhum cliente com telefone ou e-mail cadastrado para o envio.'
        });
      }

      const [ruleRecord, metadata] = await Promise.all([
        prisma.tenantNotificationRule.findUnique({
          where: { tenantId_trigger: { tenantId, trigger: 'COURSE_NEW_BROADCAST' } }
        }),
        Promise.resolve(WhatsappTemplateEngine.getMetadata('COURSE_NEW_BROADCAST'))
      ]);

      const templateText = ruleRecord?.customWhatsappText || metadata.defaultWhatsappText;
      const coursePriceFormatted = course.price ? Number(course.price).toFixed(2) : 'Consulte';
      const courseEnrollUrl = `https://marquesuahora.com.br/${tenant.slug}/cursos`;

      // Executa em background com intervalo seguro anti-ban (8 a 10s)
      setImmediate(async () => {
        let sentCount = 0;
        let failCount = 0;

        for (let i = 0; i < targetClients.length; i++) {
          const client = targetClients[i];
          const firstName = client.name.trim().split(' ')[0] || 'Cliente';

          const text = WhatsappTemplateEngine.render(templateText, {
            client_first_name: firstName,
            client_name: client.name,
            course_title: course.title,
            course_description: course.description || 'Confira os detalhes e garanta sua vaga:',
            course_price: coursePriceFormatted,
            course_duration: 'Acesso imediato',
            course_enroll_url: courseEnrollUrl,
            business_name: tenant.name
          });

          // 1. WhatsApp
          if (ruleRecord?.whatsappEnabled !== false && client.phone) {
            try {
              const res = await EvolutionService.sendTextMessage(tenantId, client.phone, text);
              await prisma.notificationLog.create({
                data: {
                  tenantId,
                  trigger: 'COURSE_NEW_BROADCAST',
                  channel: 'WHATSAPP',
                  recipient: client.phone,
                  status: res.simulated ? 'SIMULATED' : res.success ? 'SENT' : 'FAILED',
                  sentAt: new Date()
                }
              });
              sentCount++;
            } catch (err: any) {
              failCount++;
            }
          }

          // 2. E-mail via Resend
          if (ruleRecord?.emailEnabled !== false && client.email) {
            const emailSubject = WhatsappTemplateEngine.render(
              ruleRecord?.customEmailSubject || metadata.defaultEmailSubject,
              {
                client_first_name: firstName,
                client_name: client.name,
                course_title: course.title,
                course_description: course.description || 'Confira os detalhes e garanta sua vaga:',
                course_price: coursePriceFormatted,
                course_duration: 'Acesso imediato',
                course_enroll_url: courseEnrollUrl,
                business_name: tenant.name
              }
            );
            const emailBody = WhatsappTemplateEngine.render(
              ruleRecord?.customEmailBody || metadata.defaultEmailBody,
              {
                client_first_name: firstName,
                client_name: client.name,
                course_title: course.title,
                course_description: course.description || 'Confira os detalhes e garanta sua vaga:',
                course_price: coursePriceFormatted,
                course_duration: 'Acesso imediato',
                course_enroll_url: courseEnrollUrl,
                business_name: tenant.name
              }
            );

            try {
              const emailRes = await EmailService.send({
                to: client.email,
                subject: emailSubject,
                html: emailBody,
                tenantName: tenant.name
              });
              await prisma.notificationLog.create({
                data: {
                  tenantId,
                  trigger: 'COURSE_NEW_BROADCAST',
                  channel: 'EMAIL',
                  recipient: client.email,
                  status: emailRes.simulated ? 'SIMULATED' : emailRes.success ? 'SENT' : 'FAILED',
                  errorMessage: emailRes.error,
                  sentAt: new Date()
                }
              });
            } catch (emailErr: any) {
              await prisma.notificationLog.create({
                data: {
                  tenantId,
                  trigger: 'COURSE_NEW_BROADCAST',
                  channel: 'EMAIL',
                  recipient: client.email,
                  status: 'FAILED',
                  errorMessage: emailErr.message,
                  sentAt: new Date()
                }
              });
            }
          }

          if (i < targetClients.length - 1) {
            const antiBanDelayMs = Math.floor(Math.random() * 2000) + 8000;
            await new Promise((resolve) => setTimeout(resolve, antiBanDelayMs));
          }
        }

        await NotificationsService.create({
          tenantId,
          category: NotificationCategory.COURSE,
          priority: NotificationPriority.LOW,
          title: 'Divulgação de Curso Concluída',
          message: `O envio do curso "${course.title}" foi concluído. ${sentCount} mensagens enviadas (${failCount} falhas).`,
          link: '/dashboard/cursos'
        });
      });

      return reply.send({
        success: true,
        targetedCount: targetClients.length,
        message: `Divulgação iniciada para ${targetClients.length} contatos com cadência segura anti-ban.`
      });
    });
  });
};
