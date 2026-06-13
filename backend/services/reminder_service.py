"""
Reminder service: scheduled notifications via Twilio SMS.
In production, run check_due_reminders() with APScheduler or Celery Beat.
"""
from datetime import datetime, timedelta
from typing import List
import pytz

from config import settings

IST = pytz.timezone("Asia/Kolkata")


def should_notify(reminder: dict, now: datetime = None) -> bool:
    """
    Returns True if the reminder notification should fire right now.
    Checks: date + time - notify_before_min <= now <= date + time
    """
    if reminder.get("status") != "pending":
        return False
    if now is None:
        now = datetime.now(IST)

    try:
        date_str = str(reminder["date"])
        time_str = str(reminder.get("time", "09:00"))[:5]
        due_dt = IST.localize(datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M"))
        notify_before = int(reminder.get("notify_before_min", 60))
        window_start  = due_dt - timedelta(minutes=notify_before)
        return window_start <= now <= due_dt
    except Exception as e:
        print(f"[Reminder] Error checking reminder {reminder.get('rid')}: {e}")
        return False


def format_sms(reminder: dict) -> str:
    """Format a reminder into an SMS message string."""
    task   = reminder.get("task", "Financial reminder")
    date   = reminder.get("date", "")
    time   = str(reminder.get("time", ""))[:5]
    amount = reminder.get("amount", 0)
    rel    = reminder.get("related_to", "")

    msg = f"[FinMind AI] 🔔 Reminder: {task}"
    if amount:
        msg += f" — ₹{int(amount):,}"
    msg += f"\nDue: {date} at {time}"
    if rel:
        msg += f" | {rel}"
    return msg


async def send_reminder_sms(reminder: dict) -> bool:
    """Send a reminder SMS via Twilio. Returns True on success."""
    try:
        from twilio.rest import Client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(
            body=format_sms(reminder),
            from_=settings.twilio_phone,
            to=settings.user_mobile,
        )
        print(f"[Reminder] SMS sent for rid={reminder.get('rid')}")
        return True
    except Exception as e:
        print(f"[Reminder] SMS error for rid={reminder.get('rid')}: {e}")
        return False


async def check_due_reminders(reminders: List[dict]) -> List[dict]:
    """
    Check all pending reminders and fire SMS for those in their notification window.
    Returns list of reminders that were notified.
    """
    notified = []
    now = datetime.now(IST)
    for r in reminders:
        if should_notify(r, now):
            success = await send_reminder_sms(r)
            if success:
                notified.append(r)
    return notified


def get_upcoming(reminders: List[dict], days_ahead: int = 7) -> List[dict]:
    """Return reminders due within the next N days, sorted by date."""
    now = datetime.now(IST).date()
    cutoff = now + timedelta(days=days_ahead)
    upcoming = []
    for r in reminders:
        if r.get("status") != "pending":
            continue
        try:
            due = datetime.strptime(str(r["date"]), "%Y-%m-%d").date()
            if now <= due <= cutoff:
                upcoming.append(r)
        except Exception:
            continue
    return sorted(upcoming, key=lambda r: str(r.get("date", "")))
