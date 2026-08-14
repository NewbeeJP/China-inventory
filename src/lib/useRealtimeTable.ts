import { useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

// 频道名必须每个组件实例都不一样：supabase-js 按名字缓存频道对象，
// 同一张表被两个组件订阅时会拿到同一个已经 subscribe() 过的频道，
// 再挂回调就会抛 "cannot add postgres_changes callbacks ... after subscribe()"。
export function useRealtimeTable(table: string, onChange: () => void) {
  // 回调放进 ref，这样父组件每次重渲染换了新函数也不必重订阅。
  const handler = useRef(onChange);
  handler.current = onChange;

  useEffect(() => {
    const channel = supabase
      .channel(`realtime:${table}:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => handler.current())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table]);
}
