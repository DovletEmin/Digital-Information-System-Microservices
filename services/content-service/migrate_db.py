"""
Ð¡ÐºÑ€Ð¸Ð¿Ñ‚ Ð´Ð»Ñ ÑÐ¾Ð·Ð´Ð°Ð½Ð¸Ñ/Ð¾Ð±Ð½Ð¾Ð²Ð»ÐµÐ½Ð¸Ñ Ñ‚Ð°Ð±Ð»Ð¸Ñ† Ð±Ð°Ð·Ñ‹ Ð´Ð°Ð½Ð½Ñ‹Ñ…
"""
from sqlalchemy import inspect, text
from database import Base, engine
from models import (
    Article, Book, Dissertation,
    ArticleCategory, BookCategory, DissertationCategory,
    SavedArticle, SavedBook, SavedDissertation,
    ArticleHighlight, BookHighlight, DissertationHighlight
)

def create_tables():
    """Ð¡Ð¾Ð·Ð´Ð°ÐµÑ‚ Ð²ÑÐµ Ñ‚Ð°Ð±Ð»Ð¸Ñ†Ñ‹ Ð² Ð±Ð°Ð·Ðµ Ð´Ð°Ð½Ð½Ñ‹Ñ…"""
    print("Ð¡Ð¾Ð·Ð´Ð°Ð½Ð¸Ðµ Ñ‚Ð°Ð±Ð»Ð¸Ñ† Ð² Ð±Ð°Ð·Ðµ Ð´Ð°Ð½Ð½Ñ‹Ñ…...")
    Base.metadata.create_all(bind=engine)
    ensure_columns()
    print("âœ“ Ð¢Ð°Ð±Ð»Ð¸Ñ†Ñ‹ ÑƒÑÐ¿ÐµÑˆÐ½Ð¾ ÑÐ¾Ð·Ð´Ð°Ð½Ñ‹!")
    print("\nÐ¡Ð¾Ð·Ð´Ð°Ð½Ð½Ñ‹Ðµ Ñ‚Ð°Ð±Ð»Ð¸Ñ†Ñ‹:")
    print("- articles")
    print("- books")
    print("- dissertations")
    print("- article_categories_table")
    print("- book_categories_table")
    print("- dissertation_categories_table")
    print("- saved_articles")
    print("- saved_books")
    print("- saved_dissertations")
    print("- article_highlights")
    print("- book_highlights")
    print("- dissertation_highlights")

def ensure_columns():
    """Ð”Ð¾Ð±Ð°Ð²Ð»ÑÐµÑ‚ Ð½ÐµÐ´Ð¾ÑÑ‚Ð°ÑŽÑ‰Ð¸Ðµ ÐºÐ¾Ð»Ð¾Ð½ÐºÐ¸ Ð² ÑÑƒÑ‰ÐµÑÑ‚Ð²ÑƒÑŽÑ‰Ð¸Ðµ Ñ‚Ð°Ð±Ð»Ð¸Ñ†Ñ‹"""
    inspector = inspect(engine)

    def add_column_if_missing(table_name: str, column_name: str, column_type: str):
        columns = {col["name"] for col in inspector.get_columns(table_name)}
        if column_name not in columns:
            print(f"Ð”Ð¾Ð±Ð°Ð²Ð»ÐµÐ½Ð¸Ðµ ÐºÐ¾Ð»Ð¾Ð½ÐºÐ¸ {table_name}.{column_name}...")
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type};"))

    def drop_not_null_if_present(table_name: str, column_name: str):
        columns = {col["name"]: col for col in inspector.get_columns(table_name)}
        col = columns.get(column_name)
        if col and not col.get("nullable", True):
            print(f"Ð£Ð±Ð¸Ñ€Ð°ÐµÐ¼ NOT NULL Ñ {table_name}.{column_name}...")
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table_name} ALTER COLUMN {column_name} DROP NOT NULL;"))

    add_column_if_missing("articles", "authors_workplace", "VARCHAR(255)")
    add_column_if_missing("articles", "thumbnail", "VARCHAR(500)")
    add_column_if_missing("books", "authors_workplace", "VARCHAR(255)")
    add_column_if_missing("books", "thumbnail", "VARCHAR(500)")
    add_column_if_missing("books", "description", "TEXT")
    add_column_if_missing("books", "content", "TEXT")
    add_column_if_missing("books", "pdf_file_url", "VARCHAR(500)")
    add_column_if_missing("books", "epub_file_url", "VARCHAR(500)")
    drop_not_null_if_present("books", "content")
    add_column_if_missing("dissertations", "authors_workplace", "VARCHAR(255)")
    add_column_if_missing("dissertations", "thumbnail", "VARCHAR(500)")

if __name__ == "__main__":
    create_tables()
