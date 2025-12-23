const db = require('../db');
const bcrypt = require('bcryptjs');

// Получение профиля
const getProfile = async (request, reply) => {
  const res = await db.query('SELECT id, username, role, fullname, "avatarUrl" FROM users WHERE id = $1', [request.user.userId]);
  const profile = res.rows[0];
  
  if (!profile) return reply.code(404).send({ error: 'Профиль не найден' });
  return profile;
};

// Обновление профиля
const updateProfile = async (request, reply) => {
  const { id } = request.params; // Получаем ID из URL (/users/1)
  const { fullname, avatarUrl } = request.body;
  const requesterId = request.user.userId;

  // Защита: Пользователь может менять только СВОЙ профиль (или если он админ)
  if (parseInt(id) !== requesterId && request.user.role !== 'admin') {
    return reply.code(403).send({ error: 'Вы не можете редактировать чужой профиль' });
  }

  try {
    // Получаем текущие данные, чтобы не стереть то, что не передали
    const currentRes = await db.query('SELECT fullname, "avatarUrl" FROM users WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) return reply.code(404).send({ error: 'Пользователь не найден' });
    
    const currentUser = currentRes.rows[0];
    const newFullname = fullname !== undefined ? fullname : currentUser.fullname;
    const newAvatarUrl = avatarUrl !== undefined ? avatarUrl : currentUser.avatarUrl;

    await db.query(
      'UPDATE users SET fullname = $1, "avatarUrl" = $2 WHERE id = $3', 
      [newFullname, newAvatarUrl, id]
    );

    return { 
      message: 'Профиль обновлен', 
      user: { id: parseInt(id), fullname: newFullname, avatarUrl: newAvatarUrl }
    };
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка сервера при обновлении' });
  }
};

// Смена пароля
const changePassword = async (request, reply) => {
  const { id } = request.params;
  const { password } = request.body;
  const requesterId = request.user.userId;

  if (parseInt(id) !== requesterId) {
    return reply.code(403).send({ error: 'Вы можете менять пароль только себе' });
  }

  if (!password || password.length < 6) {
    return reply.code(400).send({ error: 'Пароль должен быть минимум 6 символов' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);
    return { message: 'Пароль успешно изменен' };
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка сервера при смене пароля' });
  }
};

module.exports = { getProfile, updateProfile, changePassword };