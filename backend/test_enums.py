import asyncio
import asyncpg
import os

async def main():
    conn = await asyncpg.connect("postgresql://supervision_user:super2005@192.168.1.103:5433/supervision_db")
    
    # Get all enum types
    enums = await conn.fetch('''
        SELECT t.typname, e.enumlabel
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        ORDER BY t.typname;
    ''')
    for row in enums:
        print(f"Enum: {row['typname']} -> Value: {row['enumlabel']}")
        
    await conn.close()

asyncio.run(main())
