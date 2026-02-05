#!/bin/bash
# Comprehensive migration script to fix all database issues

echo "=== Content Service Database Migration ==="
echo ""
echo "Step 1: Adding missing columns..."

docker exec -i smu-postgres-content psql -U content_user -d content_db <<'EOF'
-- Articles table
ALTER TABLE articles ADD COLUMN IF NOT EXISTS authors_workplace VARCHAR(255);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(500);

-- Books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS authors_workplace VARCHAR(255);
ALTER TABLE books ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(500);

-- Dissertations table
ALTER TABLE dissertations ADD COLUMN IF NOT EXISTS authors_workplace VARCHAR(255);
ALTER TABLE dissertations ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(500);

-- Verify columns exist
SELECT 'Articles columns:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'articles' 
ORDER BY ordinal_position;

SELECT 'Books columns:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'books' 
ORDER BY ordinal_position;

SELECT 'Dissertations columns:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'dissertations' 
ORDER BY ordinal_position;
EOF

echo ""
echo "Step 2: Restarting content-service..."
docker compose restart content-service

echo ""
echo "Step 3: Rebuilding and restarting media-service..."
docker compose up -d --build media-service

echo ""
echo "✓ Migration complete!"
echo ""
echo "Please test:"
echo "1. Creating articles/books/dissertations in admin panel"
echo "2. Uploading images"
echo "3. Viewing content on frontend"
