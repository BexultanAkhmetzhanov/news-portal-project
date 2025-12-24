// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google'; // Добавляем импорт

import './index.css';

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
import ProtectedRoute from './components/ProtectedRoute';

import ComicsPage from './components/ComicsPage'; 

// Твой Client ID
const GOOGLE_CLIENT_ID = '868998184944-71dsjnt8nhe756k6ocihfe54fbf678ff.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />}>
              
              {/* --- Публичные роуты --- */}
              <Route index element={<NewsList />} />
              
              <Route path="comics" element={<ComicsPage />} />
              <Route path="category/comics" element={<ComicsPage />} />

              <Route path="news/:id" element={<NewsArticle />} />
              <Route path="category/:slug" element={<CategoryPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="login" element={<LoginForm />} />

              {/* --- Защищенные роуты --- */}
              <Route element={<ProtectedRoute allowedRoles={['user', 'editor', 'admin']} />}>
                <Route path="profile" element={<Profile />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['editor', 'admin']} />}>
                <Route path="admin" element={<AdminDashboard />} />
                <Route path="admin/edit/:id" element={<AdminPostEdit />} />
              </Route>
              
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);