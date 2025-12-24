const db = require('./db');

const run = async () => {
  try {
    console.log('🇰🇿 Создаем структуру Правительства РК...');

    // 1. Сносим старую таблицу, если она была неправильной
    await db.query(`DROP TABLE IF EXISTS government_positions CASCADE;`);

    // 2. Создаем новую таблицу
    // occupant_name - Имя человека (например, "Олжас Бектенов")
    // photo_url - Ссылка на фото
    // is_vacant - Если true, значит "Место свободно"
    await db.query(`
      CREATE TABLE IF NOT EXISTS government_positions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL, -- Название должности (напр. "Министр Цифровизации")
        occupant_name VARCHAR(255),  -- ФИО (может быть NULL, если вакантно)
        photo_url TEXT,              -- Фото
        parent_id INTEGER REFERENCES government_positions(id) ON DELETE SET NULL, -- Кто начальник
        is_vacant BOOLEAN DEFAULT FALSE, -- Флаг "Свободно"
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 3. Создаем "Верхушку" — Президента
    const check = await db.query('SELECT count(*) FROM government_positions');
    if (parseInt(check.rows[0].count) === 0) {
      // Добавляем Президента (root)
      const presRes = await db.query(`
        INSERT INTO government_positions (title, occupant_name, parent_id) 
        VALUES ('Президент Республики Казахстан', 'Касым-Жомарт Токаев', NULL)
        RETURNING id;
      `);
      const presId = presRes.rows[0].id;

      console.log('✅ Президент добавлен.');

      // Добавляем Премьер-Министра (подчиняется Президенту)
      await db.query(`
        INSERT INTO government_positions (title, occupant_name, parent_id) 
        VALUES ('Премьер-Министр РК', 'Олжас Бектенов', $1)
      `, [presId]);
      
      console.log('✅ Премьер-Министр добавлен.');
    }

    console.log('🎉 Таблица готова!');
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  } finally {
    process.exit();
  }
};

run();