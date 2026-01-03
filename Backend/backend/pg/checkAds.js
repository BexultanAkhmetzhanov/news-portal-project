const db = require('./db');
require('dotenv').config();

const checkAds = async () => {
  try {
    console.log('🔍 Проверяем базу данных...');

    // Запрос к системной таблице PostgreSQL, чтобы узнать структуру таблицы ads
    const res = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ads';
    `);

    if (res.rows.length === 0) {
      console.log('❌ Таблицы "ads" НЕ СУЩЕСТВУЕТ.');
      console.log('➡️ Нужно запустить скрипт создания таблицы.');
    } else {
      console.log('✅ Таблица "ads" найдена.');
      
      // Выводим список колонок красивой табличкой
      console.table(res.rows.map(row => ({ 
        Column: row.column_name, 
        Type: row.data_type 
      })));

      // Проверяем наличие самой важной колонки
      const hasPlacement = res.rows.some(r => r.column_name === 'placement');
      
      if (hasPlacement) {
        console.log('👍 Всё отлично! Колонка "placement" на месте. Можно кодить.');
      } else {
        console.log('⚠️ ВНИМАНИЕ: Таблица есть, но в ней НЕТ колонки "placement"!');
        console.log('➡️ Таблицу нужно удалить и создать заново.');
      }
    }

  } catch (err) {
    console.error('Ошибка при проверке:', err);
  } finally {
    process.exit();
  }
};

checkAds();