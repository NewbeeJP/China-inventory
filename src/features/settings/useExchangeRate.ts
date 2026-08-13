import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRealtimeTable } from '../../lib/useRealtimeTable';
import type { ExchangeRate } from '../../types/database';

export function useExchangeRate() {
  const [rate, setRate] = useState<ExchangeRate | null>(null);

  const refetch = useCallback(async () => {
    const { data } = await supabase.from('exchange_rate').select('*').eq('id', 1).single();
    if (data) setRate(data as ExchangeRate);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtimeTable('exchange_rate', refetch);

  const updateRate = useCallback(async (rmbToJpy: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from('exchange_rate')
      .update({ rmb_to_jpy: rmbToJpy, updated_by: user?.id, updated_at: new Date().toISOString() })
      .eq('id', 1);
  }, []);

  return { rate, updateRate };
}
