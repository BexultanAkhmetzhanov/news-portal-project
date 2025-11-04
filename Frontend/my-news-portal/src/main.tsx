import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import './index.css';

import App from './App';
import NewsList from './components/NewsList';
import NewsArticle from './components/NewsArticle';
import LoginForm from './components/LoginForm';
import AdminDashboard from './components/AdminDashboard';
import CategoryPage from './components/CategoryPage';
import SearchPage from './components/SearchPage';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<NewsList />} />
          <Route path="news/:id" element={<NewsArticle />} />
          <Route path="category/:slug" element={<CategoryPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="login" element={<LoginForm />} />
          <Route path="admin" element={<AdminDashboard />} />

        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);