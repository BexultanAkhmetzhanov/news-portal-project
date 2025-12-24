const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

const register = async (request, reply) => {
  const { username, password } = request.body;
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    const countRes = await db.query('SELECT COUNT(*) FROM users');
    const role = (parseInt(countRes.rows[0].count) === 0) ? 'admin' : 'user';
    const insertRes = await db.query(
      'INSERT INTO users (username, password, role, "authProvider") VALUES ($1, $2, $3, $4) RETURNING id',
      [username, hashedPassword, role, 'local']
    );
    return reply.code(201).send({ message: 'Пользователь создан', userId: insertRes.rows[0].id });
  } catch (err) {
    if (err.code === '23505') return reply.code(409).send({ error: 'Имя пользователя занято' });
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка сервера' });
  }
};

const login = async (request, reply) => {
  const { username, password } = request.body;
  const res = await db.query('SELECT * FROM users WHERE username = $1', [username]);
  const user = res.rows[0];
  
  if (!user) return reply.code(401).send({ error: 'Неверные имя пользователя или пароль' });
  if (!user.password && user.authProvider === 'google') return reply.code(400).send({ error: 'Пожалуйста, войдите через Google' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return reply.code(401).send({ error: 'Неверные имя пользователя или пароль' });

  const accessToken = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET, { expiresIn: '8h' }
  );

  reply.setCookie('accessToken', accessToken, { path: '/', httpOnly: true, secure: false, maxAge: 8 * 60 * 60 });
  return { user: { id: user.id, username: user.username, role: user.role, fullname: user.fullname, avatarUrl: user.avatarUrl } };
};

// --- МЕТОД ДЛЯ ВХОДА ЧЕРЕЗ GOOGLE ---
const googleAuth = async (request, reply) => {
  const { token } = request.body;

  if (!token) {
    return reply.code(400).send({ error: 'Token is required' });
  }

  try {
    // 1. Проверяем токен в Google
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!googleRes.ok) throw new Error('Invalid Google Token');
    
    const googleData = await googleRes.json();
    const { sub: googleId, email, name: fullname, picture: photoUrl } = googleData;

    // 2. Ищем или создаем юзера
    const userRes = await db.query(
      'SELECT * FROM users WHERE "googleId" = $1 OR email = $2', 
      [googleId, email]
    );
    
    let user = userRes.rows[0];
    let isNewUser = false;
    
    if (user) {
      // Обновляем данные, если зашел первый раз через гугл (линковка)
      if (!user.googleId) {
        await db.query(
          'UPDATE users SET "googleId" = $1, "authProvider" = $2, "avatarUrl" = COALESCE("avatarUrl", $3), fullname = COALESCE(fullname, $4) WHERE id = $5',
          [googleId, 'google', photoUrl, fullname, user.id]
        );
        // Обновляем объект user для токена
        user.googleId = googleId;
        user.avatarUrl = user.avatarUrl || photoUrl;
        user.fullname = user.fullname || fullname;
      }
    } else {
      isNewUser = true;
      let newUsername = email.split('@')[0];
      const checkUser = await db.query('SELECT 1 FROM users WHERE username = $1', [newUsername]);
      if (checkUser.rows.length > 0) {
         newUsername = `${newUsername}${Math.floor(Math.random() * 1000)}`;
      }

      const role = 'user'; 

      const newUserRes = await db.query(
        `INSERT INTO users (username, email, role, "googleId", "authProvider", "avatarUrl", fullname) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [newUsername, email, role, googleId, 'google', photoUrl, fullname]
      );
      user = newUserRes.rows[0];
    }

    const accessToken = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET, { expiresIn: '8h' }
    );

    reply.setCookie('accessToken', accessToken, { path: '/', httpOnly: true, secure: false, maxAge: 8 * 60 * 60 });

    return { 
      message: isNewUser ? 'Регистрация через Google успешна' : 'Вход через Google выполнен',
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        fullname: user.fullname,
        avatarUrl: user.avatarUrl
      } 
    };

  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка авторизации через Google' });
  }
};

const logout = async (request, reply) => {
  reply.clearCookie('accessToken', { path: '/' });
  return { message: 'Выход выполнен' };
};

const getMe = async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: 'Не авторизован' });
    const res = await db.query('SELECT id, username, role, fullname, "avatarUrl" FROM users WHERE id = $1', [request.user.userId]);
    if (res.rows.length === 0) return reply.code(404).send({ error: 'User not found' });
    return res.rows[0];
}

module.exports = { register, login, logout, googleAuth, getMe };