"""
Скрипт для создания/обновления таблиц базы данных
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
    """Создает все таблицы в базе данных"""
    print("Создание таблиц в базе данных...")
    Base.metadata.create_all(bind=engine)
    ensure_columns()
    print("✓ Таблицы успешно созданы!")
    print("\nСозданные таблицы:")
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
    """Добавляет недостающие колонки в существующие таблицы"""
    inspector = inspect(engine)

    def add_column_if_missing(table_name: str, column_name: str, column_type: str):
        columns = {col["name"] for col in inspector.get_columns(table_name)}
        if column_name not in columns:
            print(f"Добавление колонки {table_name}.{column_name}...")
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type};"))

    add_column_if_missing("articles", "authors_workplace", "VARCHAR(255)")
    add_column_if_missing("books", "authors_workplace", "VARCHAR(255)")
    add_column_if_missing("dissertations", "authors_workplace", "VARCHAR(255)")

if __name__ == "__main__":
    create_tables()
