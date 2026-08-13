import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRealtimeTable } from '../../lib/useRealtimeTable';
import type { ProductWithStock } from '../../types/database';

export function useProducts() {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('products_with_stock')
      .select('*')
      .order('name_cn', { ascending: true });
    if (!error && data) setProducts(data as ProductWithStock[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtimeTable('products', refetch);
  useRealtimeTable('transactions', refetch);

  return { products, loading, refetch };
}
