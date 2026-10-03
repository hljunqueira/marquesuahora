import { FastifyPluginAsync } from 'fastify';
import axios from 'axios';
import { onlyDigits } from '@marquesuahora/shared';
import { redis } from '../../lib/redis';

export const lookupRoutes: FastifyPluginAsync = async (app) => {
  // Consulta de CNPJ / Documento Nacional (com Cache Redis de 24 horas)
  app.get('/document/:doc', async (request, reply) => {
    const { doc } = request.params as { doc: string };
    const cleanDoc = onlyDigits(doc);

    if (cleanDoc.length !== 14) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Para busca automática de dados cadastrais, informe um CNPJ válido de 14 dígitos.'
      });
    }

    // 1. Tenta carregar do cache Redis
    const cacheKey = `lookup:doc:${cleanDoc}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return reply.send(JSON.parse(cached));
      }
    } catch {
      // Falha silenciosa de cache
    }

    // 2. Busca externa com timeout seguro e tratamento acolhedor
    try {
      const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cleanDoc}`, {
        timeout: 5000
      });

      const data = response.data;
      const result = {
        documentNumber: cleanDoc,
        legalName: data.razao_social || '',
        name: data.nome_fantasia || data.razao_social || '',
        cnae: data.cnae_fiscal_descricao || '',
        addressZip: onlyDigits(data.cep || ''),
        addressStreet: data.logradouro || '',
        addressNumber: data.numero || '',
        addressComplement: data.complemento || '',
        addressNeighborhood: data.bairro || '',
        addressCity: data.municipio || '',
        addressState: data.uf || ''
      };

      // Grava no cache por 24 horas (86400s)
      try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 86400);
      } catch {
        // Ignora erro de escrita de cache
      }

      return reply.send(result);
    } catch {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Não localizamos os dados deste CNPJ na base pública. Você pode preencher manualmente com tranquilidade.'
      });
    }
  });

  // Consulta Inteligente de CEP (com detecção de CEP único de município)
  app.get('/cep/:cep', async (request, reply) => {
    const { cep } = request.params as { cep: string };
    const cleanCep = onlyDigits(cep);

    if (cleanCep.length !== 8) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'O CEP informado deve conter 8 dígitos numéricos.'
      });
    }

    const cacheKey = `lookup:cep:${cleanCep}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return reply.send(JSON.parse(cached));
      }
    } catch {
      // Ignora erro de cache
    }

    try {
      const response = await axios.get(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`, {
        timeout: 5000
      });

      const data = response.data;
      const isSingleCityZip = !data.street || data.street.trim() === '';

      const result = {
        zip: cleanCep,
        street: data.street || '',
        neighborhood: data.neighborhood || '',
        city: data.city || '',
        state: data.state || '',
        isSingleCityZip
      };

      try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 86400 * 7); // 7 dias
      } catch {
        // Ignora
      }

      return reply.send(result);
    } catch {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'CEP não localizado. Por favor, confira o número ou preencha o endereço manualmente.'
      });
    }
  });
};
