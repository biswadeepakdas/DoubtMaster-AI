"""Bookmarks & Study Collections — save questions for revision.

Endpoints:
  POST   /bookmarks                — bookmark a question
  DELETE /bookmarks/{question_id}  — remove bookmark
  GET    /bookmarks                — list bookmarked questions
  POST   /bookmarks/collections    — create a study collection
  GET    /bookmarks/collections    — list collections
  PUT    /bookmarks/collections/{id} — update collection
  DELETE /bookmarks/collections/{id} — delete collection
  PUT    /bookmarks/{question_id}/move — move bookmark to a collection
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, get_current_user
from app.core.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])


# ── Request / response models ────────────────────────────────────────────────

class BookmarkRequest(BaseModel):
    question_id: str
    collection_id: Optional[str] = None
    note: str = ""


class CollectionRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = ""
    color: str = "#6366f1"
    icon: str = "bookmark"


class MoveBookmarkRequest(BaseModel):
    collection_id: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _ensure_default_collection(db: AsyncSession, user_id: str) -> str:
    """Get or create the user's default 'Saved' collection."""
    result = await db.execute(
        text("""
            SELECT id FROM study_collections
            WHERE user_id = :uid AND is_default = true
            LIMIT 1
        """),
        {"uid": user_id},
    )
    row = result.one_or_none()
    if row:
        return str(row[0])

    insert = await db.execute(
        text("""
            INSERT INTO study_collections (user_id, name, description, is_default, color, icon)
            VALUES (:uid, 'Saved Questions', 'Your default bookmark collection', true, '#6366f1', 'bookmark')
            RETURNING id
        """),
        {"uid": user_id},
    )
    return str(insert.one()[0])


# ── Bookmark endpoints ────────────────────────────────────────────────────────

@router.post("")
async def create_bookmark(
    body: BookmarkRequest,
    db:   AsyncSession = Depends(get_db),
    ctx:  AuthContext  = Depends(get_current_user),
):
    """Bookmark a question, optionally into a collection."""
    # Verify question exists and belongs to user
    q_result = await db.execute(
        text("SELECT id, subject, text FROM questions WHERE id = :qid AND user_id = :uid"),
        {"qid": body.question_id, "uid": ctx.user_id},
    )
    if not q_result.one_or_none():
        raise HTTPException(404, "Question not found or not yours")

    collection_id = body.collection_id
    if not collection_id:
        collection_id = await _ensure_default_collection(db, ctx.user_id)

    try:
        await db.execute(
            text("""
                INSERT INTO bookmarks (user_id, question_id, collection_id, note)
                VALUES (:uid, :qid, :cid, :note)
                ON CONFLICT (user_id, question_id)
                DO UPDATE SET collection_id = :cid, note = :note
            """),
            {"uid": ctx.user_id, "qid": body.question_id, "cid": collection_id, "note": body.note},
        )
    except Exception as e:
        logger.error("Bookmark creation failed: %s", e)
        raise HTTPException(500, "Failed to bookmark question")

    return {"message": "Question bookmarked", "questionId": body.question_id, "collectionId": collection_id}


@router.delete("/{question_id}")
async def remove_bookmark(
    question_id: str,
    db:  AsyncSession = Depends(get_db),
    ctx: AuthContext  = Depends(get_current_user),
):
    """Remove a bookmark."""
    result = await db.execute(
        text("DELETE FROM bookmarks WHERE user_id = :uid AND question_id = :qid RETURNING id"),
        {"uid": ctx.user_id, "qid": question_id},
    )
    if not result.one_or_none():
        raise HTTPException(404, "Bookmark not found")
    return {"message": "Bookmark removed"}


@router.get("")
async def list_bookmarks(
    collection_id: Optional[str] = None,
    subject: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db:  AsyncSession = Depends(get_db),
    ctx: AuthContext  = Depends(get_current_user),
):
    """List bookmarked questions with optional filtering."""
    conditions = ["b.user_id = :uid"]
    params: dict = {"uid": ctx.user_id, "lim": min(limit, 100), "off": offset}

    if collection_id:
        conditions.append("b.collection_id = :cid")
        params["cid"] = collection_id

    if subject:
        conditions.append("q.subject = :subj")
        params["subj"] = subject

    where = " AND ".join(conditions)

    result = await db.execute(
        text(f"""
            SELECT b.id AS bookmark_id, b.note, b.created_at AS bookmarked_at,
                   q.id AS question_id, q.text AS question_text, q.subject, q.topic,
                   q.class AS grade, q.difficulty,
                   s.final_answer, s.confidence, s.concept_tags,
                   sc.id AS collection_id, sc.name AS collection_name, sc.color AS collection_color
            FROM bookmarks b
            JOIN questions q ON q.id = b.question_id
            LEFT JOIN solutions s ON s.question_id = q.id
            LEFT JOIN study_collections sc ON sc.id = b.collection_id
            WHERE {where}
            ORDER BY b.created_at DESC
            LIMIT :lim OFFSET :off
        """),
        params,
    )
    rows = result.mappings().all()

    # Total count
    count_result = await db.execute(
        text(f"SELECT COUNT(*) FROM bookmarks b JOIN questions q ON q.id = b.question_id WHERE {where}"),
        params,
    )
    total = count_result.scalar_one()

    bookmarks = []
    for r in rows:
        bookmarks.append({
            "bookmarkId": str(r["bookmark_id"]),
            "questionId": str(r["question_id"]),
            "questionText": r["question_text"],
            "subject": r["subject"],
            "topic": r["topic"],
            "grade": r["grade"],
            "difficulty": r["difficulty"],
            "finalAnswer": r["final_answer"],
            "confidence": r["confidence"],
            "conceptTags": r["concept_tags"] or [],
            "note": r["note"],
            "bookmarkedAt": str(r["bookmarked_at"]),
            "collection": {
                "id": str(r["collection_id"]) if r["collection_id"] else None,
                "name": r["collection_name"],
                "color": r["collection_color"],
            } if r["collection_id"] else None,
        })

    return {"bookmarks": bookmarks, "total": total, "limit": limit, "offset": offset}


@router.put("/{question_id}/move")
async def move_bookmark(
    question_id: str,
    body: MoveBookmarkRequest,
    db:   AsyncSession = Depends(get_db),
    ctx:  AuthContext  = Depends(get_current_user),
):
    """Move a bookmark to a different collection."""
    result = await db.execute(
        text("""
            UPDATE bookmarks SET collection_id = :cid
            WHERE user_id = :uid AND question_id = :qid
            RETURNING id
        """),
        {"uid": ctx.user_id, "qid": question_id, "cid": body.collection_id},
    )
    if not result.one_or_none():
        raise HTTPException(404, "Bookmark not found")
    return {"message": "Bookmark moved", "collectionId": body.collection_id}


# ── Collection endpoints ──────────────────────────────────────────────────────

@router.post("/collections")
async def create_collection(
    body: CollectionRequest,
    db:   AsyncSession = Depends(get_db),
    ctx:  AuthContext  = Depends(get_current_user),
):
    """Create a study collection."""
    # Cap at 20 collections per user
    count = await db.execute(
        text("SELECT COUNT(*) FROM study_collections WHERE user_id = :uid"),
        {"uid": ctx.user_id},
    )
    if count.scalar_one() >= 20:
        raise HTTPException(400, "Maximum 20 collections allowed")

    result = await db.execute(
        text("""
            INSERT INTO study_collections (user_id, name, description, color, icon)
            VALUES (:uid, :name, :desc, :color, :icon)
            RETURNING id
        """),
        {"uid": ctx.user_id, "name": body.name, "desc": body.description,
         "color": body.color, "icon": body.icon},
    )
    coll_id = str(result.one()[0])
    return {"id": coll_id, "name": body.name, "description": body.description,
            "color": body.color, "icon": body.icon}


@router.get("/collections")
async def list_collections(
    db:  AsyncSession = Depends(get_db),
    ctx: AuthContext  = Depends(get_current_user),
):
    """List all study collections with bookmark counts."""
    result = await db.execute(
        text("""
            SELECT sc.id, sc.name, sc.description, sc.color, sc.icon, sc.is_default,
                   sc.created_at,
                   COUNT(b.id) AS bookmark_count
            FROM study_collections sc
            LEFT JOIN bookmarks b ON b.collection_id = sc.id
            WHERE sc.user_id = :uid
            GROUP BY sc.id
            ORDER BY sc.is_default DESC, sc.created_at
        """),
        {"uid": ctx.user_id},
    )
    rows = result.mappings().all()
    collections = [
        {
            "id": str(r["id"]),
            "name": r["name"],
            "description": r["description"],
            "color": r["color"],
            "icon": r["icon"],
            "isDefault": r["is_default"],
            "bookmarkCount": r["bookmark_count"],
            "createdAt": str(r["created_at"]),
        }
        for r in rows
    ]
    return {"collections": collections}


@router.put("/collections/{collection_id}")
async def update_collection(
    collection_id: str,
    body: CollectionRequest,
    db:   AsyncSession = Depends(get_db),
    ctx:  AuthContext  = Depends(get_current_user),
):
    """Update a collection's details."""
    result = await db.execute(
        text("""
            UPDATE study_collections
            SET name = :name, description = :desc, color = :color, icon = :icon, updated_at = now()
            WHERE id = :cid AND user_id = :uid AND is_default = false
            RETURNING id
        """),
        {"cid": collection_id, "uid": ctx.user_id,
         "name": body.name, "desc": body.description, "color": body.color, "icon": body.icon},
    )
    if not result.one_or_none():
        raise HTTPException(404, "Collection not found or cannot modify default collection")
    return {"message": "Collection updated"}


@router.delete("/collections/{collection_id}")
async def delete_collection(
    collection_id: str,
    db:  AsyncSession = Depends(get_db),
    ctx: AuthContext  = Depends(get_current_user),
):
    """Delete a collection. Bookmarks move to default collection."""
    # Get default collection
    default_id = await _ensure_default_collection(db, ctx.user_id)

    if collection_id == default_id:
        raise HTTPException(400, "Cannot delete the default collection")

    # Move bookmarks to default
    await db.execute(
        text("UPDATE bookmarks SET collection_id = :did WHERE collection_id = :cid AND user_id = :uid"),
        {"did": default_id, "cid": collection_id, "uid": ctx.user_id},
    )

    result = await db.execute(
        text("DELETE FROM study_collections WHERE id = :cid AND user_id = :uid AND is_default = false RETURNING id"),
        {"cid": collection_id, "uid": ctx.user_id},
    )
    if not result.one_or_none():
        raise HTTPException(404, "Collection not found")

    return {"message": "Collection deleted, bookmarks moved to Saved Questions"}
