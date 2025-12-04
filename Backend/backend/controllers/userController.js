const db = require('../db');

const getProfile = async (request, reply) => {
  const res = await db.query('SELECT id, username, role, fullname, "avatarUrl" FROM users WHERE id = $1', [request.user.userId]);
  const profile = res.rows[0];
  
  if (!profile) return reply.code(404).send({ error: 'Профиль не найден' });
  return profile;
};

const updateProfile = async (request, reply) => {
  const { fullname, avatarUrl } = request.body;
  try {
    await db.query('UPDATE users SET fullname = $1, "avatarUrl" = $2 WHERE id = $3', [fullname, avatarUrl, request.user.userId]);
    return { 
      message: 'Профиль обновлен', 
      user: { id: request.user.userId, username: request.user.username, role: request.user.role, fullname, avatarUrl }
    };
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка сервера при обновлении профиля' });
  }
};

module.exports = { getProfile, updateProfile };