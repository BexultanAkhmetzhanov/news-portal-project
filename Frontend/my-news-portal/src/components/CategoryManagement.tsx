// src/components/CategoryManagement.tsx
import { useState, type FormEvent } from 'react';
import apiClient from '../api/apiClient';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface CategoryManagementProps {
  categories: Category[]; // Получаем список от родителя
  onCategoriesUpdate: () => void; // Функция для обновления списка у родителя
}

function CategoryManagement({ categories, onCategoriesUpdate }: CategoryManagementProps) {
  const [error, setError] = useState<string | null>(null);
  
  // Стейты для формы создания
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');

  // Стейт для редактирования (чтобы знать, какую строку мы меняем)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');

  // Обработчик создания
  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/admin/categories', { name: newName, slug: newSlug });
      setNewName('');
      setNewSlug('');
      onCategoriesUpdate(); // Обновляем список у родителя
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка при создании');
    }
  };

  // Обработчик удаления
  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить эту категорию?')) return;
    setError(null);
    try {
      await apiClient.delete(`/admin/categories/${id}`);
      onCategoriesUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка при удалении');
    }
  };
  
  // Вход в режим редактирования
  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditSlug(category.slug);
    setError(null);
  };

  // Сохранение изменений
  const handleSaveEdit = async (id: number) => {
    setError(null);
    try {
      await apiClient.put(`/admin/categories/${id}`, { name: editName, slug: editSlug });
      setEditingId(null); // Выход из режима редактирования
      onCategoriesUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка при обновлении');
    }
  };


  return (
    <section>
      <h3>Управление Категориями</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Форма создания */}
      <form onSubmit={handleCreate} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Название (н.п. Политика)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Slug (н.п. politics)"
          value={newSlug}
          onChange={(e) => setNewSlug(e.target.value.toLowerCase().trim())}
          required
        />
        <button type="submit">Создать</button>
      </form>

      {/* Список категорий */}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {categories.map((category) => (
          <li key={category.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid #eee' }}>
            {editingId === category.id ? (
              // Режим редактирования
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <input
                  type="text"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => handleSaveEdit(category.id)} style={{ backgroundColor: 'var(--tengri-green)', color: 'white' }}>Сохранить</button>
                  <button onClick={() => setEditingId(null)}>Отмена</button>
                </div>
              </>
            ) : (
              // Обычный режим
              <>
                <span>
                  <strong>{category.name}</strong> ({category.slug})
                </span>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => startEdit(category)} style={{ backgroundColor: '#007aff', color: 'white' }}>Изменить</button>
                  <button onClick={() => handleDelete(category.id)} style={{ backgroundColor: '#ff4d4d', color: 'white' }}>Удалить</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default CategoryManagement;