"""Database engine and session management."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from src.config import get_settings

_settings = get_settings()

_engine = create_async_engine(
    _settings.database_url,
    pool_size=_settings.database_pool_size,
    max_overflow=_settings.database_max_overflow,
    echo=_settings.database_echo,
)

_async_session_factory = async_sessionmaker(
    _engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that provides a database session."""
    async with _async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def create_all_tables() -> None:
    """Create all database tables. Use only in development/testing."""
    async with _engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def drop_all_tables() -> None:
    """Drop all database tables. Use only in testing."""
    async with _engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
