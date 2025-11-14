// backend/seed.js

const db = require('./db.js'); // Подключаем нашу базу

/*
  Мы будем использовать категории, которые уже должны быть в базе:
  1: Политика (politics)
  2: Спорт (sport)
  3: Технологии (tech)
  
  Мы добавим новые категории из скриншота:
  4: Экономика (economy)
  5: Наука (science)
  6: Коронавирус (coronavirus)
  7: Регионы (regions)
*/

console.log('Запуск скрипта наполнения (seeding)...');

function run(query, params = []) {
  try {
    return db.prepare(query).run(params);
  } catch (err) {
    if (!err.message.includes('UNIQUE constraint failed')) {
      console.error(`Ошибка выполнения: ${query}`, err.message);
    }
  }
}

function get(query, params = []) {
  try {
    return db.prepare(query).get(params);
  } catch (err) {
    console.error(`Ошибка получения: ${query}`, err.message);
    return null;
  }
}

// --- 1. Добавляем недостающие категории ---
console.log('Добавление категорий...');
run("INSERT INTO categories (name, slug) VALUES (?, ?)", ['Экономика', 'economy']);
run("INSERT INTO categories (name, slug) VALUES (?, ?)", ['Наука', 'science']);
run("INSERT INTO categories (name, slug) VALUES (?, ?)", ['Коронавирус', 'coronavirus']);
run("INSERT INTO categories (name, slug) VALUES (?, ?)", ['Регионы', 'regions']);

// --- 2. Получаем ID всех категорий ---
// (Это нужно, чтобы вставлять новости с правильным category_id)
const politicsCat = get("SELECT id FROM categories WHERE slug = 'politics'");
const economyCat = get("SELECT id FROM categories WHERE slug = 'economy'");
const sportCat = get("SELECT id FROM categories WHERE slug = 'sport'");
const scienceCat = get("SELECT id FROM categories WHERE slug = 'science'");
const coronavirusCat = get("SELECT id FROM categories WHERE slug = 'coronavirus'");
const regionsCat = get("SELECT id FROM categories WHERE slug = 'regions'");

const dummyText = `
Это полный текст новости, который будет отображаться на странице самой новости. 
Он гораздо длиннее, чем короткое описание, которое мы видим на главной.
Здесь могут быть несколько абзацев, описывающих детали события.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
`;

const newsItems = [
  // --- Главная новость (Featured) ---
  {
    title: 'Президент объявил о новых мерах поддержки бизнеса',
    content: `Президент Касым-Жомарт Токаев объявил о значительном пакете мер, направленных на поддержку малого и среднего бизнеса в условиях текущей экономической ситуации.${dummyText}`,
    imageUrl: 'https://storage.inform.kz/kazinform/images/0/4/04012g.jpg',
    category_id: politicsCat?.id || null,
    is_featured: 1, // <--- Главная новость
    view_count: 1324,
  },
  // --- Live (Сайдбар) ---
  {
    title: 'Митингующие собрались на акцию протеста в центре города',
    content: `Десятки людей вышли на несанкционированную акцию протеста в центре столицы.${dummyText}`,
    imageUrl: null,
    category_id: null, // (LIVE - без категории)
    is_featured: 0,
    view_count: 58,
  },
  // --- Правая колонка ---
  {
    title: 'Сборная команда одержала победу в товарищеском матче',
    content: `Национальная сборная по футболу одержала уверенную победу над командой соперника со счетом 3:1.${dummyText}`,
    imageUrl: 'https://cdn.pixabay.com/photo/2016/11/29/02/05/audience-1866738_1280.jpg',
    category_id: sportCat?.id || null,
    is_featured: 0,
    view_count: 1203,
  },
  {
    title: 'Цены на нефть превысили 90 долларов за баррель',
    content: `Мировые цены на нефть марки Brent впервые с начала года превысили отметку в 90 долларов за баррель.${dummyText}`,
    imageUrl: 'https://cdn.pixabay.com/photo/2017/08/10/06/34/container-2618919_1280.jpg',
    category_id: economyCat?.id || null,
    is_featured: 0,
    view_count: 1248,
  },
  {
    title: 'Ученые объявили о новом открытии в области квантовой физики',
    content: `Международная группа ученых объявила о прорыве в понимании квантовой запутанности, что может привести к созданию новых типов компьютеров.${dummyText}`,
    imageUrl: 'https://cdn.pixabay.com/photo/2017/09/14/11/53/processor-2748800_1280.jpg',
    category_id: scienceCat?.id || null,
    is_featured: 0,
    view_count: 1130,
  },
  // --- Нижняя сетка ---
  {
    title: 'В регионе введены новые ограничения из-за COVID-19',
    content: `В связи с ростом числа заболевших, в регионе вновь вводятся масочный режим и ограничения на массовые мероприятия.${dummyText}`,
    imageUrl: 'https://cdn.pixabay.com/photo/2020/03/27/15/44/syringe-4973942_1280.jpg',
    category_id: coronavirusCat?.id || null,
    is_featured: 0,
    view_count: 1057,
  },
  {
    title: 'Власти сообщили о завершении строительства новой школы',
    content: `В новом микрорайоне города завершилось строительство современной школы на 1200 мест.${dummyText}`,
    imageUrl: 'https://cdn.pixabay.com/photo/2017/03/28/12/09/school-2181961_1280.jpg',
    category_id: regionsCat?.id || null,
    is_featured: 0,
    view_count: 980,
  },
  {
    title: 'Казахстанские теннисисты вышли в финал крупного турнира',
    content: `Елена Рыбакина и Александр Бублик показали отличные результаты на этой неделе.${dummyText}`,
    imageUrl: 'https://cdn.pixabay.com/photo/2024/05/27/14/56/tennis-8791981_1280.jpg',
    category_id: sportCat?.id || null,
    is_featured: 0,
    view_count: 1500,
  },
];

// --- 3. Вставляем новости ---
console.log('Добавление новостей...');

const stmt = db.prepare(`
  INSERT INTO news (title, content, imageUrl, category_id, is_featured, view_count, createdAt) 
  VALUES (@title, @content, @imageUrl, @category_id, @is_featured, @view_count, DATETIME('now', '-' || CAST(ABS(RANDOM() % 1440) AS TEXT) || ' minute'))
`);

const insertMany = db.transaction((items) => {
  for (const item of items) {
    // Устанавливаем значения по умолчанию, если они null
    const params = {
      title: item.title,
      content: item.content,
      imageUrl: item.imageUrl || null,
      category_id: item.category_id || null,
      is_featured: item.is_featured || 0,
      view_count: item.view_count || 0,
    };
    stmt.run(params);
  }
});

try {
  insertMany(newsItems);
  console.log(`Успешно добавлено ${newsItems.length} новостей.`);
} catch (err) {
  console.error('Ошибка при массовой вставке:', err.message);
}

console.log('Наполнение базы данных завершено.');

// --- 4. Добавляем рекламу (AdBanners) ---
console.log('Добавление рекламных баннеров...');
run(
  "INSERT INTO ads (placement, adCode) VALUES (?, ?)",
  [
    'sidebar', 
    '<div style="background:#222; color:white; padding: 20px; text-align:center; border-radius: 4px;"><h3>Это ваша РЕКЛАМА</h3><p>Лучшее место для вашего баннера.</p></div>'
  ]
);

console.log('Скрипт завершен.');