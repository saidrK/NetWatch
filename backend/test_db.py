import asyncio
from database.postgresql import async_session_maker
from models.equipement import Equipement
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from api.v1.equipements import EquipementDetailResponse

async def main():
    async with async_session_maker() as session:
        query = select(Equipement).options(selectinload(Equipement.ports)).where(Equipement.is_active == True)
        result = await session.execute(query)
        eqs = result.scalars().all()
        for eq in eqs:
            response = EquipementDetailResponse.model_validate(eq)
            print(f"IP: {response.adresse_ip}, Ports in DB: {len(eq.ports)}, Ports in Response: {len(response.ports)}")
            if response.ports:
                print(f"  First port in response: {response.ports[0].numero}")

asyncio.run(main())
