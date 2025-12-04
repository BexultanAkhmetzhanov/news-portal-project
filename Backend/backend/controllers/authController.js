const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;

const register = async (request, reply) => {
  const { username, password } = request.body;
  
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    // Проверяем, первый ли это пользователь (если да — делаем админом)
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
    const { count } = countStmt.get();
    const role = (count === 0) ? 'admin' : 'user';

    const stmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
    const info = stmt.run(username, hashedPassword, role);
    
    request.log.info(`Создан новый пользователь: ${username}, Роль: ${role}`);
    
    return reply.code(201).send({ message: 'Пользователь создан', userId: info.lastInsertRowid });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return reply.code(409).send({ error: 'Имя пользователя занято' });
    }
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка сервера' });
  }
};

const login = async (request, reply) => {
  const { username, password } = request.body;
  
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username);
  
  if (!user) {
    return reply.code(401).send({ error: 'Неверные имя пользователя или пароль' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return reply.code(401).send({ error: 'Неверные имя пользователя или пароль' });
  }

  const accessToken = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' } 
  );

  reply.setCookie('accessToken', accessToken, {
    path: '/',
    httpOnly: true,
    secure: false, // В продакшене true
    maxAge: 8 * 60 * 60,
  });

  return { 
    user: { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      fullname: user.fullname,
      avatarUrl: user.avatarUrl
    } 
  };
};

const logout = async (request, reply) => {
  reply.clearCookie('accessToken', { path: '/' });
  return { message: 'Выход выполнен' };
};

module.exports = {
  register,
  login,
  logout
};