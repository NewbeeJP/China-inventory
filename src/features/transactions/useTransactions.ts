import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRealtimeTable } from '../../lib/useRealtimeTable';
import type { TransactionWithProduct } from '../../types/database';

export function useTransactions(productId?: number) {
  const [transactions, setTransactions] = useState<TransactionWithProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    let query = supabase
      .from('transactions')
      .select('*, product:products(id, name_cn, sku)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (productId != null) query = query.eq('product_id', productId);
    const { data, error } = await query;
    if (!error && data) setTransactions(data as unknown as TransactionWithProduct[]);
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtimeTable('transactions', refetch);

  return { transactions, loading };
}
