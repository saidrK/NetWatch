import asyncio
from backend.database.postgresql import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        queries = [
            "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'equipement';",
            "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'alerte';"
        ]
        for q in queries:
            result = await db.execute(text(q))
            print("---")
            for row in result:
                print(row)

asyncio.run(main())
