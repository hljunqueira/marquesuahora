import { FastifyPluginAsync } from 'fastify';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // GET /uploads/:filename - Servir arquivo estático
  app.get('/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    const safeFilename = path.basename(filename);
    const filePath = path.join(uploadsDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ error: 'Arquivo não encontrado' });
    }

    const ext = path.extname(safeFilename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.ogg': 'video/ogg',
      '.pdf': 'application/pdf'
    };

    const contentType = mimeMap[ext] || 'application/octet-stream';
    reply.header('Content-Type', contentType);
    reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    const stream = fs.createReadStream(filePath);
    return reply.send(stream);
  });

  // POST /uploads - Enviar arquivo (imagem ou vídeo)
  app.post('/', async (request, reply) => {
    if (!request.isMultipart()) {
      return reply.status(400).send({ error: 'Requisição deve ser multipart/form-data' });
    }

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'Nenhum arquivo enviado.' });
    }

    const ext = path.extname(data.filename) || '.bin';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    const filePath = path.join(uploadsDir, uniqueName);

    await pipeline(data.file, fs.createWriteStream(filePath));

    const baseUrl = (process.env.API_URL || 'https://api.marquesuahora.com.br').replace(/\/+$/, '');
    const absoluteUrl = `${baseUrl}/uploads/${uniqueName}`;

    return reply.send({
      url: absoluteUrl,
      relativeUrl: `/uploads/${uniqueName}`,
      filename: data.filename,
      mimetype: data.mimetype
    });
  });
};
