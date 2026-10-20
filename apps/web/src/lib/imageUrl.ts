/**
 * Utilitário centralizado para resolução de URLs de imagens
 * Lida com URLs absolutas, caminhos relativos de /uploads da API e imagens em DataURL/Base64.
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  let trimmed = url.trim();
  if (!trimmed) return '';

  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.marquesuahora.com.br';
  const cleanBase = rawApiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');

  // Converte URLs salvas com localhost para o domínio da API em produção
  if (trimmed.includes('localhost:') || trimmed.includes('127.0.0.1:')) {
    trimmed = trimmed.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, cleanBase);
  }

  // Converte http:// para https:// quando referenciar o domínio marquesuahora.com.br
  if (trimmed.startsWith('http://api.marquesuahora.com.br') || trimmed.startsWith('http://marquesuahora.com.br')) {
    trimmed = trimmed.replace('http://', 'https://');
  }

  // Se já for uma URL completa segura ou base64
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Se for um caminho relativo (ex: /uploads/xxx.png)
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${cleanBase}${cleanPath}`;
}
