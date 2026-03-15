#!/bin/bash
# Установка PostgreSQL локально через Homebrew для hockey-id-crm

set -e

# 1. Установка Homebrew (если не установлен)
if ! command -v brew &>/dev/null; then
  echo "Установка Homebrew..."
  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Добавить brew в PATH (Apple Silicon)
  if [ -f /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -f /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
fi

# 2. Установка PostgreSQL 16
echo "Установка PostgreSQL 16..."
brew install postgresql@16

# 3. Добавить postgresql в PATH
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
export PATH="/usr/local/opt/postgresql@16/bin:$PATH"

# 4. Запуск PostgreSQL
echo "Запуск PostgreSQL..."
brew services start postgresql@16

# 5. Подождать пока PostgreSQL запустится
sleep 3

# 6. Создать базу hockey_crm
echo "Создание базы hockey_crm..."
createdb hockey_crm 2>/dev/null || echo "База hockey_crm уже существует"

# 7. Обновить .env для локального PostgreSQL (Homebrew: trust auth, user = текущий пользователь)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
USER=$(whoami)
ENV_FILE="$PROJECT_ROOT/.env"
NEW_URL="postgresql://${USER}@localhost:5432/hockey_crm?schema=public"
if [ -f "$ENV_FILE" ]; then
  if grep -q '^DATABASE_URL=' "$ENV_FILE"; then
    sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"${NEW_URL}\"|" "$ENV_FILE" 2>/dev/null || \
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"${NEW_URL}\"|" "$ENV_FILE"
  else
    echo "DATABASE_URL=\"${NEW_URL}\"" >> "$ENV_FILE"
  fi
  echo "Обновлён .env"
fi

echo ""
echo "Готово. Запусти: npx prisma migrate dev --name init"
