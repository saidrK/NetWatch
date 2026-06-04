import asyncio
from backend.database.postgresql import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT typname FROM pg_type WHERE typtype = 'e';"))
        for row in result:
            print(row[0])

asyncio.run(main())
