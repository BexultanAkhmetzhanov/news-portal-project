const db = require('../db');

// Рекурсивная функция сборки дерева
function buildTree(items, parentId = null) {
  return items
    .filter(item => item.parent_id === parentId)
    .map(item => ({
      ...item,
      key: item.id, // Нужно для Ant Design Tree
      children: buildTree(items, item.id)
    }));
}

// 1. Получить структуру (Публично)
const getTree = async (req, reply) => {
  try {
    const res = await db.query(`
      SELECT id, title, occupant_name, photo_url, parent_id, is_vacant 
      FROM government_positions 
      ORDER BY id ASC
    `);
    const tree = buildTree(res.rows, null);
    return tree;
  } catch (err) {
    console.error(err);
    return reply.code(500).send({ error: 'Ошибка сервера' });
  }
};

// 2. Добавить должность (В админке)
const addPosition = async (req, reply) => {
  const { title, parentId, occupantName, photoUrl } = req.body;
  try {
    await db.query(
      'INSERT INTO government_positions (title, parent_id, occupant_name, photo_url) VALUES ($1, $2, $3, $4)',
      [title, parentId, occupantName, photoUrl]
    );
    return { message: 'Должность добавлена' };
  } catch (err) {
    return reply.code(500).send({ error: 'Ошибка создания' });
  }
};

// 3. Редактировать (Назначить человека, уволить, сменить название)
const updatePosition = async (req, reply) => {
  const { id } = req.params;
  const { title, occupantName, photoUrl, isVacant } = req.body;

  try {
    // Если нажали "Место свободно" (isVacant=true), стираем имя
    let finalName = occupantName;
    if (isVacant) finalName = null;

    await db.query(`
      UPDATE government_positions 
      SET title = COALESCE($1, title), 
          occupant_name = $2,
          photo_url = $3,
          is_vacant = $4
      WHERE id = $5
    `, [title, finalName, photoUrl, isVacant, id]);
    
    return { message: 'Обновлено' };
  } catch (err) {
    return reply.code(500).send({ error: 'Ошибка обновления' });
  }
};

// 4. Удалить должность
const deletePosition = async (req, reply) => {
    const { id } = req.params;
    try {
        const check = await db.query('SELECT id FROM government_positions WHERE parent_id = $1', [id]);
        if (check.rows.length > 0) {
            return reply.code(400).send({ error: 'Сначала удалите подчиненных!' });
        }
        await db.query('DELETE FROM government_positions WHERE id = $1', [id]);
        return { message: 'Удалено' };
    } catch (err) {
        return reply.code(500).send({ error: 'Ошибка удаления' });
    }
}

module.exports = { getTree, addPosition, updatePosition, deletePosition };