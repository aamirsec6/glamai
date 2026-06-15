"""Pytest configuration and shared fixtures."""

from __future__ import annotations

import asyncio
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlmodel import SQLModel

from src.config import get_settings

# Use SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_glamai.db"

_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
_async_session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture(scope="function")
async def db() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test."""
    async with _engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async with _async_session_factory() as session:
        yield session
        await session.rollback()

    async with _engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
