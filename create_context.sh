#!/bin/bash

# ==============================================================================
#                 Скрипт для создания единого файла контекста
#
# Этот скрипт обходит структуру проекта, генерирует дерево каталогов и
# объединяет содержимое всех релевантных текстовых файлов в один
# большой текстовый файл.
#
# Использование:
# 1. Поместите этот скрипт в корневую директорию вашего проекта.
# 2. Сделайте его исполняемым: chmod +x create_context.sh
# 3. Запустите: ./create_context.sh
#
# Результатом будет файл 'project_context.txt' в корневой директории.
# ==============================================================================

# --- Конфигурация ---
OUTPUT_FILE="project_context.txt"
PROJECT_NAME=$(basename "$PWD")

# --- Проверка зависимостей ---
if ! command -v tree &> /dev/null
then
    echo "'tree' could not be found. Please install it."
    echo "On Debian/Ubuntu: sudo apt-get install tree"
    echo "On macOS (Homebrew): brew install tree"
    exit 1
fi

if ! command -v file &> /dev/null
then
    echo "'file' could not be found. Please install it."
    exit 1
fi


# --- Начало ---
echo "🚀 Starting to generate project context for '$PROJECT_NAME'..."

# Очищаем/создаем выходной файл и добавляем стартовый заголовок
echo "--- START OF FILE $PROJECT_NAME.txt ---" > "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"


# --- 1. Генерация дерева директорий ---
echo "🌳 Generating directory structure..."
echo "Directory structure:" >> "$OUTPUT_FILE"
tree -aF --prune -I 'node_modules|.git|dist|coverage|.idea|.vscode|.tmp|*.lock|*.tsbuildinfo|postgres_*_data' >> "$OUTPUT_FILE"


# --- 2. Добавление содержимого файлов ---
echo "📚 Processing project files..."

# Используем find для поиска всех файлов, исключая ненужные директории и файлы.
# -prune используется для эффективного исключения целых директорий.
find . \
  \( -name "node_modules" -o -name ".git" -o -name "dist" -o -name "coverage" -o -name ".idea" -o -name ".vscode" -o -name ".tmp" -o -path "./postgres_*" \) -prune \
  -o -type f \
  -not -name "*package-lock.json" \
  -not -name "*yarn.lock" \
  -not -name "*.log" \
  -not -name "create_context.sh" \
  -not -name "$OUTPUT_FILE" \
  -print | sort | while read -r file; do
    
    # Пропускаем сам скрипт и его вывод
    if [[ "$file" == "./$OUTPUT_FILE" ]] || [[ "$file" == "./create_context.sh" ]]; then
        continue
    fi

    # Убираем './' из начала пути для красоты
    clean_path="${file#./}"

    echo "   -> Processing $clean_path"

    # Добавляем разделитель и заголовок файла
    echo -e "\n\n================================================\nFILE: ${clean_path}\n================================================" >> "$OUTPUT_FILE"

    # Проверяем, является ли файл бинарным.
    # Мы считаем файл бинарным, если он не содержит текстовых данных или является изображением/архивом и т.д.
    if [[ "$(file -b --mime-type "$file")" != text/* ]] && [[ "$(file -b --mime-type "$file")" != application/json* ]] && [[ "$(file -b --mime-type "$file")" != application/xml* ]] && [[ "$(file -b --mime-type "$file")" != application/javascript* ]]; then
        echo "[Binary file]" >> "$OUTPUT_FILE"
    else
        # Добавляем содержимое файла
        cat "$file" >> "$OUTPUT_FILE"
    fi
done

echo "" >> "$OUTPUT_FILE"
echo "✅ Done! Project context has been written to '$OUTPUT_FILE'."