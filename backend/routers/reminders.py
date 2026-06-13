from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import time as time_type
import datetime

from database import get_db
from models.user import User
from models.reminder import Reminder
from models.schemas import ReminderCreate, ReminderUpdate, ReminderOut
from services.auth_service import get_current_user

router = APIRouter(prefix="/reminders", tags=["Reminders"])


@router.get("/", response_model=list[ReminderOut])
async def get_reminders(
    status: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Reminder).where(Reminder.user_id == current_user.id)
    if status:
        query = query.where(Reminder.status == status)
    query = query.order_by(Reminder.date)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ReminderOut, status_code=201)
async def create_reminder(
    payload: ReminderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Parse time string "HH:MM"
    try:
        h, m = map(int, payload.time.split(":"))
        parsed_time = time_type(h, m)
    except Exception:
        parsed_time = time_type(9, 0)

    reminder = Reminder(
        user_id=current_user.id,
        type=payload.type,
        task=payload.task,
        date=payload.date,
        time=parsed_time,
        amount=payload.amount,
        status=payload.status,
        related_to=payload.related_to,
        notify_before_min=payload.notify_before_min,
    )
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.put("/{rid}", response_model=ReminderOut)
async def update_reminder(
    rid: int,
    payload: ReminderUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Reminder).where(Reminder.rid == rid, Reminder.user_id == current_user.id)
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        if field == "time" and isinstance(value, str):
            try:
                h, m = map(int, value.split(":"))
                value = time_type(h, m)
            except Exception:
                continue
        setattr(reminder, field, value)

    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.delete("/{rid}")
async def delete_reminder(
    rid: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Reminder).where(Reminder.rid == rid, Reminder.user_id == current_user.id)
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    await db.delete(reminder)
    await db.commit()
    return {"status": "success", "rid": rid}


@router.patch("/{rid}/complete")
async def complete_reminder(
    rid: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Reminder).where(Reminder.rid == rid, Reminder.user_id == current_user.id)
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    reminder.status = "done"
    await db.commit()
    return {"status": "success", "rid": rid}
