#!/bin/bash
# Quick migration to add missing columns

echo "Adding missing columns to content database..."

docker exec -i smu-postgres-content psql -U content_user -d content_db <<EOF
ALTER TABLE articles ADD COLUMN IF NOT EXISTS authors_workplace VARCHAR(255);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(500);
ALTER TABLE books ADD COLUMN IF NOT EXISTS authors_workplace VARCHAR(255);
ALTER TABLE books ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(500);
ALTER TABLE dissertations ADD COLUMN IF NOT EXISTS authors_workplace VARCHAR(255);
ALTER TABLE dissertations ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(500);
\dt
EOF

echo "Migration complete!"
