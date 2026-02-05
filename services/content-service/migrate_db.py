"""
Скрипт для создания/обновления таблиц базы данных
"""
from database import Base, engine
from models import (
    Article, Book, Dissertation,
    ArticleCategory, BookCategory, DissertationCategory,
    SavedArticle, ArticleHighlight
)

def create_tables():
    """Создает все таблицы в базе данных"""
    print("Создание таблиц в базе данных...")
    Base.metadata.create_all(bind=engine)
    print("✓ Таблицы успешно созданы!")
    print("\nСозданные таблицы:")
    print("- articles")
    print("- books")
    print("- dissertations")
    print("- article_categories_table")
    print("- book_categories_table")
    print("- dissertation_categories_table")
    print("- saved_articles")
    print("- article_highlights")

if __name__ == "__main__":
    create_tables()
