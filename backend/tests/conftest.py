import pytest
import asyncio
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
import database.postgresql as pg
from config import get_settings

settings = get_settings()

# Remplace le moteur global par NullPool AVANT que les tests tournent
_test_engine = create_async_engine(
    settings.database_url,
    poolclass=NullPool,
)
pg.engine = _test_engine
pg.AsyncSessionLocal = async_sessionmaker(
    bind=_test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()
