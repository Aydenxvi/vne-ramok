# VNE RAMOK 25 — публикация в GitHub и Render

**Эта сборка — безопасная портфолио-демоверсия, а не платёжный магазин.**

## Шаг 1 — GitHub

1. Откройте https://github.com/new в своём аккаунте GitHub.
2. Repository name: `vne-ramok`.
3. Visibility: `Public`. НЕ отмечайте `Add a README file`, `.gitignore`, `Choose a license`.
4. Нажмите `Create repository`.
5. Распакуйте `VNE_RAMOK_25_GITHUB_READY.zip` и откройте папку `vne-ramok`.
6. Установите Git for Windows, если команда `git --version` не срабатывает: https://git-scm.com/downloads/win
7. Откройте PowerShell прямо в папке `vne-ramok` (через адресную строку Проводника введите `powershell`).

Первый раз укажите **свои** имя и email для Git-коммитов (если Git попросит):

```powershell
git config --global user.name "YOUR_GITHUB_NAME"
git config --global user.email "YOUR_GITHUB_EMAIL"
```

Далее:

```powershell
git init
git add .
git status
git commit -m "VNE RAMOK 25: public portfolio demo"
git branch -M main
git remote add origin https://github.com/Aydenxvi/vne-ramok.git
git push -u origin main
```

**Важно:** перед коммитом убедитесь, что `git status` НЕ показывает `.env`, `data/`, `uploads/`, SQLite, пароли, токены и персональные данные. Эта публикационная ZIP-сборка НЕ содержит локальную базу данных и аккаунты.

Если `remote origin already exists`, пропустите строку `git remote add ...`, проверьте `git remote -v`.
Если Git попросит авторизацию, используйте окно входа GitHub/Git Credential Manager, а не пароль от GitHub в терминале.
Если у вас другой GitHub-логин, замените `Aydenxvi` в ссылке.

После удачного push: https://github.com/Aydenxvi/vne-ramok

## Шаг 2 — Render (бесплатная демоверсия)

1. Откройте https://dashboard.render.com/.
2. Авторизуйтесь, подключите GitHub к Render и предоставьте ему доступ к `vne-ramok`.
3. Выберите **New → Blueprint**.
4. Укажите репозиторий `vne-ramok`, ветку `main`. Render найдёт `render.yaml`.
5. Подтвердите создание Web Service. План в манифесте: `free`, если доступен вашему аккаунту.
6. Дождитесь статуса **Live** в панели Render. Адрес на Render появится только после создания сервиса.
7. Проверьте `https://ВАШ-АДРЕС.onrender.com/api/health` — поле `mode` должно быть `public-demo`.
8. Проверьте каталог, LOOKBOOK, OUTFIT STUDIO, вращение GLB, корзину, оформление демо-заказа и анимацию чека.
9. Убедитесь, что `/admin.html` недоступна и аккаунты не создаются.

### Если хотите создать Web Service вручную

- Environment: **Docker**
- Branch: `main`
- Instance type: **Free** (если доступен)
- Dockerfile path: `./Dockerfile`
- Env: `PUBLIC_DEMO=1`, `HOST=0.0.0.0`, `COOKIE_SECURE=1`
- Health check: `/api/health`

### Ограничения Render Free

- После 15 минут без запросов сервер засыпает, первое открытие требует дополнительного времени.
- Файловая система временная; SQLite, созданная на Render, может сбрасываться при перезапуске или деплое.
- Это нормально для **публичного деморежима**, который не сохраняет настоящие заявки и не предлагает регистрацию.
- Настоящие платежи, доставка и коммерческие продажи НЕ поддерживаются.

## Шаг 3 — финальная проверка

- `https://ВАШ-АДРЕС.onrender.com/api/health` → `public-demo`.
- При открытии чека отображается **DEMO** и нет списания денег.
- В публичном checkout стоят вымышленные заблокированные для редактирования имя, email и адрес.
- В GitHub → Actions появились результаты тестов.
- В README добавьте реальный адрес демо после того, как сервис запустится.

## Локальный режим

`start_windows.bat` или `node server.js` запускает локальную версию с SQLite и админкой. **Не публикуйте локальную базу из `data/`!**

## Официальная документация

- Render: https://render.com/docs/your-first-deploy
- Render Free: https://render.com/docs/free
- GitHub: https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository
