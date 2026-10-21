"""
One-time migration: convert all first_name / last_name fields in
`users` and `traces` collections to proper title case.

Run once:
    python /app/backend/migrate_title_case.py
"""

import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
env_path = ROOT_DIR / ".env"
if env_path.exists():
    load_dotenv(env_path, override=True)

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "traccia_fondi")


def _title_case(name: str) -> str:
    """Capitalize first letter of each word, lowercase the rest."""
    if not name:
        return name
    return " ".join(word.capitalize() for word in name.strip().split())


async def migrate():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # ---- users collection ----
    users_updated = 0
    async for user in db.users.find({}, {"_id": 1, "id": 1, "first_name": 1, "last_name": 1,
                                         "procedure_first_name": 1, "procedure_last_name": 1}):
        patch = {}
        fn = user.get("first_name", "")
        ln = user.get("last_name", "")
        pfn = user.get("procedure_first_name", "")
        pln = user.get("procedure_last_name", "")

        if fn and fn != _title_case(fn):
            patch["first_name"] = _title_case(fn)
        if ln and ln != _title_case(ln):
            patch["last_name"] = _title_case(ln)
        if pfn and pfn != _title_case(pfn):
            patch["procedure_first_name"] = _title_case(pfn)
        if pln and pln != _title_case(pln):
            patch["procedure_last_name"] = _title_case(pln)

        if patch:
            await db.users.update_one({"_id": user["_id"]}, {"$set": patch})
            users_updated += 1
            print(f"  users  [{user.get('id', '?')}] {fn!r} {ln!r}  →  {patch.get('first_name', fn)!r} {patch.get('last_name', ln)!r}")

    print(f"\nUsers migrated: {users_updated}")

    # ---- traces collection ----
    traces_updated = 0
    async for trace in db.traces.find({}, {"_id": 1, "id": 1, "first_name": 1, "last_name": 1}):
        patch = {}
        fn = trace.get("first_name", "")
        ln = trace.get("last_name", "")

        if fn and fn != _title_case(fn):
            patch["first_name"] = _title_case(fn)
        if ln and ln != _title_case(ln):
            patch["last_name"] = _title_case(ln)

        if patch:
            await db.traces.update_one({"_id": trace["_id"]}, {"$set": patch})
            traces_updated += 1
            print(f"  traces [{trace.get('id', '?')}] {fn!r} {ln!r}  →  {patch.get('first_name', fn)!r} {patch.get('last_name', ln)!r}")

    print(f"Traces migrated: {traces_updated}")
    print("\nMigration complete.")
    client.close()


if __name__ == "__main__":
    asyncio.run(migrate())
