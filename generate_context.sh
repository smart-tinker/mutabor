#!/bin/bash

# ==============================================================================
# "Умный" скрипт для генерации контекста для AI-ассистента.
# Версия 2.0 (для монорепозиториев)
# Вам не нужно ничего здесь настраивать.
# ==============================================================================

# --- Конфигурация ---
PROJECT_MODULES=("api" "client") # Папки с основными частями проекта
OUTPUT_DIR="docs"
OUTPUT_FILE="$OUTPUT_DIR/ai_context.md"

# --- Логика скрипта ---

# Создаем папку /docs, если её нет
mkdir -p "$OUTPUT_DIR"

# Перезаписываем файл, начиная с инструкции
{
  echo "# Инициализационный пакет для AI-ассистента"
  echo ""
  echo "## 0. Инструкция для AI (Контекст взаимодействия)"
  echo ""
  echo "**Привет! Это автоматический отчет о состоянии проекта. Пожалуйста, следуй этому протоколу:**"
  echo ""
  echo "1.  **Анализ.** Проанализируй этот файл, чтобы понять текущую структуру и технологии проекта."
  echo "2.  **Запрос информации.** Если для решения задачи тебе нужны файлы, не включенные в этот отчет, запроси их у меня по полному пути (например, \`client/src/features/TaskCard/TaskCard.tsx\`)."
  echo "3.  **Предоставление кода.** Давай мне готовые фрагменты кода для копирования и вставки."
  echo "4.  **Точные инструкции.** Указывай полный путь к файлу, который нужно изменить, и четко объясняй, что сделать (например, \"Открой \`client/src/app/App.tsx\` и замени содержимое на...\")."
  echo "5.  **Контроль версий.** В конце каждого успешно выполненного этапа предлагай мне команды \`git add\` и \`git commit\` для сохранения прогресса."
  echo ""
  echo "**Информация об отчете:**"
  echo "- **Сгенерировано:** $(date)"
  echo "- **Структура проекта:** Монорепозиторий с модулями: ${PROJECT_MODULES[*]}"
  echo ""
  echo "---"

  # 1. Общая структура проекта
  echo "## 1. Общая структура проекта"
  echo ""
  echo '```'
  if command -v tree &> /dev/null; then
    tree -L 3 -I 'node_modules|build|dist|.git|.vscode|docs'
  else
    echo "Утилита 'tree' не установлена. Для более детального отчета установите её: sudo apt install tree"
    find . -maxdepth 4 -path './node_modules' -prune -o -path './.git' -prune -o -path './build' -prune -o -path './dist' -prune -o -path './.vscode' -prune -o -path './docs' -prune -o -print | sed -e 's;[^/]*/;|____;g;s;____|; |;g'
  fi
  echo '```'
  echo ""

  # 2. Информация по каждому модулю (api, client)
  for module in "${PROJECT_MODULES[@]}"; do
    if [ -d "$module" ]; then
      echo "---"
      echo ""
      echo "## 2. Модуль: \`$module\`"
      echo ""

      # package.json модуля
      echo "### \`$module/package.json\`"
      echo ""
      echo '```json'
      if [ -f "$module/package.json" ]; then
        cat "$module/package.json"
      else
        echo "Файл package.json в папке '$module' не найден!"
      fi
      echo '```'
      echo ""

      # Ключевые файлы модуля
      echo "### Ключевые файлы модуля \`$module\`"
      echo ""
      found_any_in_module=false
      # Список файлов для поиска внутри модуля
      POTENTIAL_KEY_FILES=(
        "src/main.ts" "src/main.js"
        "src/app.module.ts" "src/app.controller.ts"
        "src/index.tsx" "src/index.ts" "src/index.jsx" "src/index.js"
        "src/App.tsx" "src/App.ts" "src/App.jsx" "src/App.js"
        "vite.config.ts" "vite.config.js" "next.config.js"
      )
      for file_pattern in "${POTENTIAL_KEY_FILES[@]}"; do
        file_path="$module/$file_pattern"
        if [ -f "$file_path" ]; then
          found_any_in_module=true
          echo "#### Файл: \`$file_path\`"
          echo ""
          extension="${file_path##*.}"
          lang=""
          case $extension in
            js|jsx) lang="javascript" ;;
            ts|tsx) lang="typescript" ;;
            json) lang="json" ;;
          esac
          echo '```'$lang
          cat "$file_path"
          echo '```'
          echo ""
        fi
      done
      if [ "$found_any_in_module" = false ]; then
        echo "Не удалось автоматически обнаружить ключевые файлы в модуле \`$module\`."
        echo ""
      fi
    fi
  done

} > "$OUTPUT_FILE"

echo "Готово! Инициализационный файл обновлен: $OUTPUT_FILE"
echo "Теперь скопируйте его содержимое и отправьте мне."