const db = require('../db');

const getProfile = async (request, reply) => {
  const stmt = db.prepare('SELECT id, username, role, fullname, avatarUrl FROM users WHERE id = ?');
  const profile = stmt.get(request.user.userId);
  
  if (!profile) {
    return reply.code(404).send({ error: 'Профиль не найден' });
  }
  return profile;
};

const updateProfile = async (request, reply) => {
  const { fullname, avatarUrl } = request.body;
  
  try {
    const stmt = db.prepare('UPDATE users SET fullname = ?, avatarUrl = ? WHERE id = ?');
    stmt.run(fullname, avatarUrl, request.user.userId);
    
    return { 
      message: 'Профиль обновлен', 
      user: {
        id: request.user.userId,
        username: request.user.username,
        role: request.user.role,
        fullname,
        avatarUrl
      }
    };
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка сервера при обновлении профиля' });
  }
};

module.exports = { getProfile, updateProfile };