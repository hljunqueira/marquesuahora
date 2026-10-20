'use client';

import { useEffect, useCallback } from 'react';

export type QueryKey =
  | 'tenant'
  | 'categories'
  | 'services'
  | 'showcase'
  | 'appointments'
  | 'financial'
  | 'team';

interface QueryInvalidationEventDetail {
  keys: QueryKey[];
  timestamp: number;
  payload?: any;
}

const EVENT_NAME = 'marquesuahora_query_invalidated';

/**
 * Dispara invalidação de uma ou mais chaves de query em tempo real para todos os ouvintes.
 */
export function invalidateQueries(keys: QueryKey | QueryKey[], payload?: any): void {
  if (typeof window === 'undefined') return;

  const keyList = Array.isArray(keys) ? keys : [keys];
  const detail: QueryInvalidationEventDetail = {
    keys: keyList,
    timestamp: Date.now(),
    payload
  };

  window.dispatchEvent(new CustomEvent<QueryInvalidationEventDetail>(EVENT_NAME, { detail }));

  // Dispara compatibilidade retroativa para eventos legados específicos
  if (keyList.includes('tenant')) {
    window.dispatchEvent(new CustomEvent('marquesuahora_tenant_sync', { detail: payload }));
  }
  if (keyList.includes('appointments') || keyList.includes('categories') || keyList.includes('services')) {
    window.dispatchEvent(new CustomEvent('marquesuahora_agenda_sync', { detail: payload }));
  }
}

/**
 * Hook para componentes ouvirem a invalidação de chaves de query específicas
 * e executarem recarregamento de dados automático e silencioso.
 */
export function useQueryInvalidation(
  keys: QueryKey[],
  onInvalidate: (invalidatedKey: QueryKey, payload?: any) => void
): void {
  const handleEvent = useCallback(
    (event: Event) => {
      const customEvent = event as CustomEvent<QueryInvalidationEventDetail>;
      if (!customEvent.detail || !Array.isArray(customEvent.detail.keys)) return;

      const matchedKey = customEvent.detail.keys.find((k) => keys.includes(k));
      if (matchedKey) {
        onInvalidate(matchedKey, customEvent.detail.payload);
      }
    },
    [keys, onInvalidate]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener(EVENT_NAME, handleEvent);
    return () => {
      window.removeEventListener(EVENT_NAME, handleEvent);
    };
  }, [handleEvent]);
}
