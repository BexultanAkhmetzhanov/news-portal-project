// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import './index.css';

// 1. Импортируем все компоненты
import App from './App';
import NewsList from './components/NewsList';
import NewsArticle from './components/NewsArticle';
import LoginForm from './components/LoginForm';
import AdminDashboard from './components/AdminDashboard';
import CategoryPage from './components/CategoryPage';
import SearchPage from './components/SearchPage';
import Profile from './components/Profile';
import AdminPostEdit from './components/AdminPostEdit';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute'; // 2. Импортируем ProtectedRoute

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            
            {/* --- 1. Публичные роуты --- */}
            <Route index element={<NewsList />} />
            <Route path="news/:id" element={<NewsArticle />} />
            <Route path="category/:slug" element={<CategoryPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="login" element={<LoginForm />} />

            {/* --- 2. Роуты для ВСЕХ залогиненных (user, editor, admin) --- */}
            <Route element={<ProtectedRoute allowedRoles={['user', 'editor', 'admin']} />}>
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* --- 3. Роуты для Редакторов и Админов (editor, admin) --- */}
            <Route element={<ProtectedRoute allowedRoles={['editor', 'admin']} />}>
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/edit/:id" element={<AdminPostEdit />} />
            </Route>
            
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);