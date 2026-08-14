import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRealtimeTable } from '../../lib/useRealtimeTable';
import type { Batch, BatchLine } from '../../types/database';

export interface BatchSummary extends Batch {
  line_count: number;
  total_quantity: number;
}

const LINE_SELECT =
  '*, product:products(id, name_cn, sku, box_qty, net_weight, gross_weight, cbm, price_jpy, price_rmb)';

export function useBatches() {
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from('batches')
      .select('*, transactions(quantity)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    const rows = (data ?? []) as (Batch & { transactions: { quantity: number }[] })[];
    setBatches(
      rows.map(({ transactions, ...batch }) => ({
        ...batch,
        line_count: transactions.length,
        total_quantity: transactions.reduce((sum, t) => sum + t.quantity, 0),
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtimeTable('batches', refetch);
  useRealtimeTable('transactions', refetch);

  return { batches, loading };
}

export function useBatch(id: number) {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [lines, setLines] = useState<BatchLine[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const [batchResult, lineResult] = await Promise.all([
      supabase.from('batches').select('*').eq('id', id).single(),
      supabase.from('transactions').select(LINE_SELECT).eq('batch_id', id).order('id'),
    ]);
    setBatch((batchResult.data as Batch) ?? null);
    setLines((lineResult.data ?? []) as unknown as BatchLine[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtimeTable('transactions', refetch);

  return { batch, lines, loading, refetch };
}
