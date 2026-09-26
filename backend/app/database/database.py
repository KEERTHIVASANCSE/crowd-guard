from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# If using SQLite, check_same_thread needs to be False
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def migrate_db():
    """Ensure newly added columns exist in SQLite database without losing data."""
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            res = conn.execute(text("PRAGMA table_info(incidents)"))
            existing_cols = {row[1] for row in res.fetchall()}
            needed_cols = {
                "video_clip_path": "VARCHAR",
                "frame_number": "INTEGER",
                "tracking_ids": "TEXT",
                "evidence_reason": "TEXT",
                "dismiss_reason": "TEXT",
                "dismissed_by": "VARCHAR",
                "dismissed_at": "DATETIME",
                "is_dismissed": "BOOLEAN DEFAULT 0"
            }
            for col, col_type in needed_cols.items():
                if col not in existing_cols:
                    conn.execute(text(f"ALTER TABLE incidents ADD COLUMN {col} {col_type}"))
            conn.commit()
        except Exception:
            pass

# Run migration on load
migrate_db()

