/**
 * Utilitário centralizado para resolução de URLs de imagens
 * Lida com URLs absolutas, caminhos relativos de /uploads da API e imagens em DataURL/Base64.
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Se já for uma URL completa ou base64
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Se for um caminho relativo (ex: /uploads/xxx.png)
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.marquesuahora.com.br';
  const cleanBase = rawApiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  return `${cleanBase}${cleanPath}`;
}
