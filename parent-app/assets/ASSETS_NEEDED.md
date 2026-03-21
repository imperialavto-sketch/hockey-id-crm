# Assets для release

В папке уже есть минимальные placeholder-файлы (icon.png, splash.png) для успешной сборки dev.
Для production build замените их на полноразмерные:

| Файл | Размер | Описание |
|------|--------|----------|
| `icon.png` | 1024×1024 px | App icon, квадрат, без прозрачности для iOS |
| `splash.png` | 1284×2778 px (или 1242×2688) | Splash screen, portrait |

Положите файлы в `parent-app/assets/`:
- `parent-app/assets/icon.png`
- `parent-app/assets/splash.png`

После добавления файлов пересоберите приложение.
