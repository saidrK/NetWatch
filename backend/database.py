from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./test.db"  # ou postgres si tu utilises postgres

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}  # pour SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# ✅ AJOUT ICI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()