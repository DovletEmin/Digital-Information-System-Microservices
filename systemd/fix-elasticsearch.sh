#!/bin/bash

# Исправление проблемы с Elasticsearch
# Использование: sudo ./fix-elasticsearch.sh

set -e

echo "=== Исправление Elasticsearch ==="

# Проверка прав root
if [ "$EUID" -ne 0 ]; then
    echo "Пожалуйста, запустите скрипт с правами root (sudo)"
    exit 1
fi

echo "Остановка Elasticsearch (если запущен)..."
systemctl stop elasticsearch || true

echo "Настройка конфигурации для разработки..."
cat > /etc/elasticsearch/elasticsearch.yml << 'EOF'
cluster.name: smu-cluster
node.name: node-1
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch
network.host: 127.0.0.1
http.port: 9200
transport.port: 9300
xpack.security.enabled: false
xpack.security.enrollment.enabled: false
xpack.security.http.ssl.enabled: false
xpack.security.transport.ssl.enabled: false
discovery.type: single-node
EOF

echo "Установка правильных прав..."
chown -R elasticsearch:elasticsearch /etc/elasticsearch
chown -R elasticsearch:elasticsearch /var/lib/elasticsearch
chown -R elasticsearch:elasticsearch /var/log/elasticsearch
chown -R elasticsearch:elasticsearch /usr/share/elasticsearch

# Настройка JVM опций для низкого потребления памяти
cat > /etc/elasticsearch/jvm.options.d/heap.options << 'EOF'
-Xms512m
-Xmx512m
EOF

echo "Перезагрузка systemd..."
systemctl daemon-reload

echo "Запуск Elasticsearch..."
systemctl start elasticsearch

echo "Ожидание запуска (30 секунд)..."
sleep 30

echo "Проверка статуса..."
systemctl status elasticsearch --no-pager

echo ""
echo "Проверка доступности HTTP API..."
curl -X GET "localhost:9200/" || echo "Elasticsearch еще не готов, подождите немного"

echo ""
echo "Если Elasticsearch не запустился, проверьте логи:"
echo "  sudo journalctl -u elasticsearch -n 100"
echo "  sudo tail -f /var/log/elasticsearch/smu-cluster.log"
