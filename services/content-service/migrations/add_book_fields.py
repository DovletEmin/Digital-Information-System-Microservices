"""
Migration script to add new fields to books table:
- description: Text field for book description (nullable)
- pdf_file_url: String field for PDF file URL (nullable)
- epub_file_url: String field for EPUB file URL (nullable)
- Make content field nullable (was required before)

And create book_reading_progress table for tracking user reading progress.
"""

from sqlalchemy import create_engine, text
import os

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/smu_db')

engine = create_engine(DATABASE_URL)

def run_migration():
    with engine.connect() as connection:
        print("Starting migration...")
        
        # 1. Add new columns to books table
        print("Adding description column to books table...")
        try:
            connection.execute(text("""
                ALTER TABLE books 
                ADD COLUMN IF NOT EXISTS description TEXT;
            """))
            connection.commit()
            print("✓ Description column added")
        except Exception as e:
            print(f"Error adding description column: {e}")
        
        print("Adding pdf_file_url column to books table...")
        try:
            connection.execute(text("""
                ALTER TABLE books 
                ADD COLUMN IF NOT EXISTS pdf_file_url VARCHAR(500);
            """))
            connection.commit()
            print("✓ pdf_file_url column added")
        except Exception as e:
            print(f"Error adding pdf_file_url column: {e}")
        
        print("Adding epub_file_url column to books table...")
        try:
            connection.execute(text("""
                ALTER TABLE books 
                ADD COLUMN IF NOT EXISTS epub_file_url VARCHAR(500);
            """))
            connection.commit()
            print("✓ epub_file_url column added")
        except Exception as e:
            print(f"Error adding epub_file_url column: {e}")
        
        # 2. Make content nullable
        print("Making content column nullable...")
        try:
            connection.execute(text("""
                ALTER TABLE books 
                ALTER COLUMN content DROP NOT NULL;
            """))
            connection.commit()
            print("✓ Content column is now nullable")
        except Exception as e:
            print(f"Error making content nullable: {e}")
        
        # 3. Create book_reading_progress table
        print("Creating book_reading_progress table...")
        try:
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS book_reading_progress (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL,
                    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
                    current_page INTEGER DEFAULT 1 NOT NULL,
                    total_pages INTEGER,
                    progress_percentage FLOAT DEFAULT 0.0,
                    last_position TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, book_id)
                );
            """))
            connection.commit()
            print("✓ book_reading_progress table created")
        except Exception as e:
            print(f"Error creating book_reading_progress table: {e}")
        
        # 4. Create indexes
        print("Creating indexes...")
        try:
            connection.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_book_reading_progress_user_id 
                ON book_reading_progress(user_id);
            """))
            connection.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_book_reading_progress_book_id 
                ON book_reading_progress(book_id);
            """))
            connection.commit()
            print("✓ Indexes created")
        except Exception as e:
            print(f"Error creating indexes: {e}")
        
        print("\nMigration completed successfully!")

if __name__ == "__main__":
    run_migration()
