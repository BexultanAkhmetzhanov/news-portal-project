const db = require('../db');
const fs = require('fs');
const path = require('path');
const util = require('util');
const { pipeline } = require('stream');
const sharp = require('sharp'); // Используем sharp для обработки

const pump = util.promisify(pipeline);

const getProfile = async (req, reply) => {
  const userId = req.user.userId;
  const res = await db.query('SELECT id, username, fullname, role, "avatarUrl" FROM users WHERE id = $1', [userId]);
  if (res.rows.length === 0) return reply.code(404).send({ error: 'Пользователь не найден' });
  return res.rows[0];
};

const updateProfile = async (req, reply) => {
  const userId = req.user.userId;
  const { fullname, password } = req.body;

  if (password) {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET fullname = $1, password = $2 WHERE id = $3', [fullname, hashedPassword, userId]);
  } else {
    await db.query('UPDATE users SET fullname = $1 WHERE id = $2', [fullname, userId]);
  }
  return { message: 'Профиль обновлен' };
};

// --- НОВАЯ ФУНКЦИЯ ЗАГРУЗКИ АВАТАРА ---
const uploadAvatar = async (req, reply) => {
  const userId = req.user.userId;
  let uploadedFilePath = null;

  try {
    const parts = req.parts();
    for await (const part of parts) {
      if (part.file) {
        // Генерируем имя файла
        const filename = `avatar-${userId}-${Date.now()}.webp`;
        const savePath = path.join(__dirname, '..', 'uploads', filename);

        // Магия Sharp: ресайз 500x500 + конвертация в WebP
        await pump(
          part.file,
          sharp()
            .resize(500, 500, { fit: 'cover' }) // 'cover' обрезает лишнее, чтобы заполнить квадрат
            .webp({ quality: 80 }),             // Конвертация в WebP
          fs.createWriteStream(savePath)
        );

        uploadedFilePath = `/uploads/${filename}`;
      }
    }

    if (uploadedFilePath) {
      // Сохраняем путь в БД
      await db.query('UPDATE users SET "avatarUrl" = $1 WHERE id = $2', [uploadedFilePath, userId]);
      return { message: 'Аватар обновлен', avatarUrl: uploadedFilePath };
    } else {
      return reply.code(400).send({ error: 'Файл не загружен' });
    }

  } catch (err) {
    req.log.error(err);
    return reply.code(500).send({ error: 'Ошибка загрузки файла' });
  }
};

module.exports = {
  getProfile, updateProfile, uploadAvatar
};