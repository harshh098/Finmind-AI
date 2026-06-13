import asyncio
from database import AsyncSessionLocal
from services.otp_service import create_otp_session

async def main():
    async with AsyncSessionLocal() as db:
        result = await create_otp_session(
            db=db,
            user_id=7,
            action="withdraw",
            payload={"amount": 5000}
        )
        print(result)

asyncio.run(main())