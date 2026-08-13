import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRealtimeTable } from '../../lib/useRealtimeTable';
import type { ProductWithStock } from '../../types/database';

export function useProduct(id: number) {
  const [product, setProduct] = useState<ProductWithStock | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data } = await supabase.from('products_with_stock').select('*').eq('id', id).single();
    setProduct((data as ProductWithStock) ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtimeTable('products', refetch);
  useRealtimeTable('transactions', refetch);

  return { product, loading };
}
