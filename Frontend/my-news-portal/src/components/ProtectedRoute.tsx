// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles: string[]; // Массив ролей, которым разрешен доступ
}

function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Пока мы проверяем сессию (при перезагрузке), ничего не показываем
  if (loading) {
    return null;
  }

  // 1. Если не залогинен -> на страницу /login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Если роль НЕ совпадает -> на главную
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // 3. Все в порядке -> показываем страницу (AdminDashboard и т.д.)
  return <Outlet />;
}

export default ProtectedRoute;