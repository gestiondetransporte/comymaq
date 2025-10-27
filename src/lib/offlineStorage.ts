import localforage from 'localforage';
import { supabase } from '@/integrations/supabase/client';

// Configure localforage
localforage.config({
  name: 'comymaq-app',
  storeName: 'offline-data'
});

export interface PendingSync {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
}

const PENDING_SYNCS_KEY = 'pending-syncs';

export async function savePendingSync(sync: Omit<PendingSync, 'id' | 'timestamp'>): Promise<void> {
  const newSync: PendingSync = {
    ...sync,
    id: crypto.randomUUID(),
    timestamp: Date.now()
  };

  const pending = await getPendingSyncs();
  pending.push(newSync);
  await localforage.setItem(PENDING_SYNCS_KEY, pending);
}

export async function getPendingSyncs(): Promise<PendingSync[]> {
  const pending = await localforage.getItem<PendingSync[]>(PENDING_SYNCS_KEY);
  return pending || [];
}

export async function clearPendingSyncs(): Promise<void> {
  await localforage.setItem(PENDING_SYNCS_KEY, []);
}

export async function syncPendingChanges(): Promise<{ success: number; failed: number }> {
  const pending = await getPendingSyncs();
  let success = 0;
  let failed = 0;
  const failedSyncs: PendingSync[] = [];

  for (const sync of pending) {
    try {
      switch (sync.type) {
        case 'insert':
          await (supabase as any).from(sync.table).insert(sync.data);
          break;
        case 'update':
          await (supabase as any).from(sync.table).update(sync.data).eq('id', sync.data.id);
          break;
        case 'delete':
          await (supabase as any).from(sync.table).delete().eq('id', sync.data.id);
          break;
      }
      success++;
    } catch (error) {
      console.error('Sync error:', error);
      failed++;
      failedSyncs.push(sync);
    }
  }

  // Solo mantener los syncs fallidos
  if (failed > 0) {
    await localforage.setItem(PENDING_SYNCS_KEY, failedSyncs);
  } else {
    await clearPendingSyncs();
  }

  return { success, failed };
}

// Cache for offline data
export async function cacheData(key: string, data: any): Promise<void> {
  await localforage.setItem(`cache-${key}`, {
    data,
    timestamp: Date.now()
  });
}

export async function getCachedData<T>(key: string, maxAge: number = 3600000): Promise<T | null> {
  const cached = await localforage.getItem<{ data: T; timestamp: number }>(`cache-${key}`);
  
  if (!cached) return null;
  
  const age = Date.now() - cached.timestamp;
  if (age > maxAge) {
    await localforage.removeItem(`cache-${key}`);
    return null;
  }
  
  return cached.data;
}
