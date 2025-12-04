const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;

const register = async (request, reply) => {
  const { username, password } = request.body;
  
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    // Проверяем, есть ли пользователи вообще (первый станет админом)
    const countRes = await db.query('SELECT COUNT(*) FROM users');
    const role = (parseInt(countRes.rows[0].count) === 0) ? 'admin' : 'user';

    // Создаем пользователя и сразу возвращаем его ID
    const insertRes = await db.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id',
      [username, hashedPassword, role]
    );
    
    return reply.code(201).send({ message: 'Пользователь создан', userId: insertRes.rows[0].id });
  } catch (err) {
    if (err.code === '23505') { // Код ошибки уникальности в Postgres
      return reply.code(409).send({ error: 'Имя пользователя занято' });
    }
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка сервера' });
  }
};

const login = async (request, reply) => {
  const { username, password } = request.body;
  
  const res = await db.query('SELECT * FROM users WHERE username = $1', [username]);
  const user = res.rows[0];
  
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
    secure: false, 
    maxAge: 8 * 60 * 60,
  });

  return { 
    user: { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      fullname: user.fullname,
      avatarUrl: user["avatarUrl"] // В Postgres имена колонок с CamelCase нужно брать в кавычки при создании, или они становятся lowercase. Мы создали как "avatarUrl".
    } 
  };
};

const logout = async (request, reply) => {
  reply.clearCookie('accessToken', { path: '/' });
  return { message: 'Выход выполнен' };
};

module.exports = { register, login, logout };