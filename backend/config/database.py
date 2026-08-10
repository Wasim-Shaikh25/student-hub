from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from geoalchemy2 import Geometry
from config.settings import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.SQLALCHEMY_ECHO,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Enable PostGIS extensions
@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    try:
        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis")
        dbapi_conn.commit()
    except Exception:
        dbapi_conn.rollback()
