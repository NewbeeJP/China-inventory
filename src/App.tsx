import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';
import ProductListPage from './features/products/ProductListPage';
import ProductForm from './features/products/ProductForm';
import ProductDetailPage from './features/products/ProductDetailPage';
import LedgerPage from './features/transactions/LedgerPage';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="flex gap-4 border-b border-gray-200 px-4 py-3 text-sm">
        <Link to="/" className="font-medium">商品列表</Link>
        <Link to="/ledger" className="font-medium">全部流水</Link>
      </nav>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><Layout><ProductListPage /></Layout></ProtectedRoute>} />
          <Route path="/products/new" element={<ProtectedRoute><Layout><ProductForm mode="create" /></Layout></ProtectedRoute>} />
          <Route path="/products/:id/edit" element={<ProtectedRoute><Layout><ProductForm mode="edit" /></Layout></ProtectedRoute>} />
          <Route path="/products/:id" element={<ProtectedRoute><Layout><ProductDetailPage /></Layout></ProtectedRoute>} />
          <Route path="/ledger" element={<ProtectedRoute><Layout><LedgerPage /></Layout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
