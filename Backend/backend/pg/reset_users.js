// backend/reset_users.js
require('dotenv').config();
const db = require('./db');

const resetUsers = async () => {
  try {
    console.log('⏳ Удаление всех пользователей...');
    
    // TRUNCATE users: очищает таблицу
    // RESTART IDENTITY: сбрасывает счетчик ID обратно к 1
    // CASCADE: если у пользователей были комментарии или связи, это позволит удалить их без ошибок
    await db.query('TRUNCATE users RESTART IDENTITY CASCADE');
    
    console.log('✅ База пользователей полностью очищена.');
    console.log('ℹ️  Теперь первый, кто зарегистрируется на сайте, автоматически станет ADMIN.');
    
  } catch (err) {
    console.error('❌ Ошибка при удалении:', err.message);
  } finally {
    // В db.js используется pool, его нужно закрыть (или просто завершить процесс)
    process.exit();
  }
};

resetUsers();