import asyncio
from sqlalchemy import select, update
from backend.database.postgresql import AsyncSessionLocal
from backend.models.utilisateur import Utilisateur, RoleUtilisateur, Administrateur, Technicien

async def main():
    async with AsyncSessionLocal() as db:
        # Create a test tech
        tech = Technicien(nom="Tech Test", email="techtest@local.com", mot_de_passe_hash="hash", role=RoleUtilisateur.TECHNICIEN)
        db.add(tech)
        await db.commit()
        
        # Change role using direct assignment
        result = await db.execute(select(Utilisateur).where(Utilisateur.email == "techtest@local.com"))
        user = result.scalar_one()
        print("Before type:", type(user), user.role)
        
        # Method 1: direct assignment
        user.role = RoleUtilisateur.ADMINISTRATEUR
        await db.commit()
        
        # Fetch again
        result = await db.execute(select(Utilisateur).where(Utilisateur.email == "techtest@local.com"))
        user2 = result.scalar_one()
        print("After type:", type(user2), user2.role)
        
        # Cleanup
        await db.delete(user2)
        await db.commit()

asyncio.run(main())
