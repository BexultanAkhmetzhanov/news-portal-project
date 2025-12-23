# news-portal-project
News portal on React+Vite, Fastify, Postgresql

Инструкция по локальному запуску "Новостного Портала"

Для запуска проекта вам понадобится Node.js (версии 18+) и npm.

1. Клонирование репозитория

Сначала скачайте проект из вашего репозитория.
Bash

git clone https://github.com/BexultanAkhmetzhanov/news-portal-project.git
cd news-portal-project

2. Настройка Бэкенда (API)
Бэкенд должен быть запущен первым. Откройте терминал в папке проекта.

    Перейдите в папку бэкенда:
    Bash

   cd backend

Установите зависимости:
Bash

npm install

(Терминал 1) Запустите сервер:
Bash

    node server.js

    Сервер запустится на http://localhost:3001. При первом запуске он автоматически создаст в папке backend файл news.db со всей необходимой структурой.

3. Создание Администратора

Пока бэкенд (Терминал 1) работает, откройте второе (Терминал 2) окно терминала.

    Выполните curl команду для регистрации вашего первого админа. Этот пользователь автоматически получит id=1 и права admin:
    Bash

    curl -X POST http://localhost:3001/register \
    -H "Content-Type: application/json" \
    -d '{"username":"Beka", "password":"Astana123"}'

    (Вы можете изменить Beka и Astana123 на свои. Ответ должен быть {"message":"Пользователь создан","userId":1})

4. Настройка Фронтенда (Клиент)

    (Терминал 2) Теперь перейдите в папку фронтенда. Если вы еще в backend, вернитесь назад:
    Bash

cd .. 

# Перейдите в папку фронтенда
cd Frontend/my-news-portal

Установите зависимости:
Bash

npm install

Запустите dev-сервер:
Bash

    npm run dev

5. Готово!
