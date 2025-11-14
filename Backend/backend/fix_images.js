// backend/fix_images.js
const db = require('./db.js');

console.log('Запуск скрипта обновления изображений (v2, placehold.co)...');

// Карта: [Заголовок новости] -> [Новая, рабочая ссылка-ЗАГЛУШКА]
// Мы используем placehold.co, так как он 100% работает
const imageMap = {
  'Президент объявил о новых мерах поддержки бизнеса': 'https://placehold.co/800x450/333/FFF/png?text=Главная+Новость',
  'Сборная команда одержала победу в товарищеском матче': 'https://placehold.co/400x300/555/FFF/png?text=Спорт',
  'Цены на нефть превысили 90 долларов за баррель': 'https://placehold.co/400x300/555/FFF/png?text=Экономика',
  'Ученые объявили о новом открытии в области квантовой физики': 'https://placehold.co/400x300/555/FFF/png?text=Наука',
  'В регионе введены новые ограничения из-за COVID-19': 'https://placehold.co/400x300/555/FFF/png?text=COVID-19',
  'Власти сообщили о завершении строительства новой школы': 'https://placehold.co/400x300/555/FFF/png?text=Регионы',
  'Казахстанские теннисисты вышли в финал крупного турнира': 'https://placehold.co/400x300/555/FFF/png?text=Спорт'
};

const stmt = db.prepare('UPDATE news SET imageUrl = ? WHERE title = ?');

const updateMany = db.transaction((map) => {
  let changes = 0;
  for (const [title, url] of Object.entries(map)) {
    const info = stmt.run(url, title);
    changes += info.changes;
  }
  return changes;
});

try {
  const totalChanges = updateMany(imageMap);
  console.log(`Успешно обновлено ${totalChanges} изображений (v2).`);
} catch (err) {
  console.error('Ошибка при обновлении изображений (v2):', err.message);
}

console.log('Скрипт завершен (v2).');