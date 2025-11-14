// src/context/AuthContext.tsx
import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useMemo,
  useCallback, // 1. Импортируем useCallback
  type ReactNode 
} from 'react';
import apiClient from '../api/apiClient';

interface User {
  id: number;
  username: string;
  role: string;
  fullname: string | null;
  avatarUrl: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Ошибка парсинга пользователя из localStorage", error);
      localStorage.removeItem('user');
    }
    setLoading(false);
  }, []);

  // 2. Оборачиваем login в useCallback
  // Эта функция теперь "стабильна" и не будет пересоздаваться
  const login = useCallback((userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []); // Пустой массив [] означает, что функция создается 1 раз

  // 3. Оборачиваем logout в useCallback
  const logout = useCallback(async () => {
    try {
      await apiClient.post('/logout');
    } catch (error) {
      console.error("Ошибка при выходе (сервер):", error);
    } finally {
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []); // Пустой массив []

  // 4. Обновляем useMemo
  // Теперь login и logout - стабильные
  const value = useMemo(() => ({
    user,
    login,
    logout,
    loading
  }), [user, loading, login, logout]); // Добавляем их сюда

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
}