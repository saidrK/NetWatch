import asyncio
from backend.database.postgresql import async_session_maker
from backend.models.equipement import Equipement
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def main():
    async with async_session_maker() as session:
        query = select(Equipement).options(selectinload(Equipement.ports)).where(Equipement.is_active == True)
        result = await session.execute(query)
        eqs = result.scalars().all()
        for eq in eqs:
            print(f"IP: {eq.adresse_ip}, Ports count: {len(eq.ports)}")

asyncio.run(main())
