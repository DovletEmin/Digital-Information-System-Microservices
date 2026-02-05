#!/bin/bash

# Диагностика и исправление проблемы с Node.js
# Использование: ./fix-nodejs-path.sh

echo "=== Диагностика Node.js ==="
echo ""

echo "Поиск всех установленных версий Node.js:"
which -a node
echo ""

echo "Текущая версия в PATH:"
node --version
echo ""

echo "Расположение текущего node:"
which node
echo ""

echo "Проверка /usr/bin/node:"
/usr/bin/node --version 2>/dev/null || echo "Не найден в /usr/bin/node"
echo ""

echo "Проверка установки через nodesource:"
ls -la /usr/bin/node* 2>/dev/null || echo "Не найдены исполняемые файлы node"
echo ""

echo "=== Исправление ==="
echo ""

# Проверяем, есть ли Node.js в WSL PATH из Windows
if command -v node.exe &> /dev/null; then
    echo "ПРОБЛЕМА: Обнаружен node.exe из Windows в PATH"
    echo "Это WSL среда, и Windows Node.js имеет приоритет"
    echo ""
    echo "РЕШЕНИЕ: Добавьте в ~/.bashrc:"
    echo '  export PATH="/usr/bin:$PATH"'
    echo ""
    echo "Или временно для текущей сессии:"
    echo '  export PATH="/usr/bin:$PATH"'
    echo ""
fi

# Обновляем PATH для текущего скрипта
export PATH="/usr/bin:$PATH"

echo "После исправления PATH:"
node --version
echo ""

echo "=== Применение исправления ==="
if [ -n "$SUDO_USER" ]; then
    USER_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
else
    USER_HOME=$HOME
fi

if ! grep -q 'export PATH="/usr/bin:\$PATH"' "$USER_HOME/.bashrc"; then
    echo 'export PATH="/usr/bin:$PATH"' >> "$USER_HOME/.bashrc"
    echo "✓ Добавлено в $USER_HOME/.bashrc"
else
    echo "✓ Уже настроено в .bashrc"
fi

echo ""
echo "Примените изменения:"
echo "  source ~/.bashrc"
echo "  node --version"
