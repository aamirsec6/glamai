"""Bootstrap the database — create all tables."""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.database import create_all_tables


async def main():
    print("Creating database tables...")
    await create_all_tables()
    print("✅ All tables created successfully.")


if __name__ == "__main__":
    asyncio.run(main())
