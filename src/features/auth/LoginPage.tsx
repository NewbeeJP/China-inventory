import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { session, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Supabase 的失败原因区分开，否则「没验证邮箱」和「密码打错」看起来一模一样
  function describe(error: { message: string; code?: string }) {
    if (error.code === 'email_not_confirmed') return '这个账号还没验证邮箱，请在 Supabase 后台把它设为已确认';
    if (error.code === 'invalid_credentials') return '邮箱或密码不对';
    if (error.code === 'over_request_rate_limit') return '尝试太频繁，等一会儿再试';
    return `登录失败：${error.message}`;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      console.error('[登录失败]', error.code, error.status, error.message);
      setError(describe(error));
    }
  }

  // 登录成功后 session 就位，这里把用户送进商品列表；
  // 已登录状态下直接打开 /login 也会被弹回去。
  if (!loading && session) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="mb-4 text-lg font-medium">登录中国库存系统</h1>
        <label className="mb-1 block text-sm text-gray-500">邮箱</label>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <label className="mb-1 block text-sm text-gray-500">密码</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-gray-900 px-3 py-2 text-white disabled:opacity-50"
        >
          登录
        </button>
      </form>
    </div>
  );
}
