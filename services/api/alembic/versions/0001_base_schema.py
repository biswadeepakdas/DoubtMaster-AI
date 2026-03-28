"""Base schema — all tables from original design, Railway PostgreSQL (no Supabase)."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0001"
down_revision = None  # base migration


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table("users",
        sa.Column("id",            UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("phone",         sa.Text, unique=True),
        sa.Column("email",         sa.Text, unique=True),
        sa.Column("password_hash", sa.Text),
        sa.Column("name",          sa.Text, nullable=False),
        sa.Column("class",         sa.Integer, server_default="10"),
        sa.Column("board",         sa.Text,    server_default="CBSE"),
        sa.Column("language",      sa.Text,    server_default="en"),
        sa.Column("plan",          sa.Text,    server_default="free"),
        sa.Column("role",          sa.Text,    server_default="student"),
        sa.Column("is_pro",        sa.Boolean, server_default="false"),
        sa.Column("avatar_url",    sa.Text),
        sa.Column("solve_count",   sa.Integer, server_default="0"),
        sa.Column("streak",        sa.Integer, server_default="0"),
        sa.Column("best_streak",   sa.Integer, server_default="0"),
        sa.Column("last_active_at",sa.TIMESTAMPTZ),
        sa.Column("created_at",    sa.TIMESTAMPTZ, server_default=sa.text("now()")),
        sa.Column("updated_at",    sa.TIMESTAMPTZ, server_default=sa.text("now()")),
    )

    op.create_table("questions",
        sa.Column("id",         UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id",    UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("text",       sa.Text, nullable=False),
        sa.Column("image_url",  sa.Text),
        sa.Column("subject",    sa.Text, nullable=False),
        sa.Column("topic",      sa.Text),
        sa.Column("class",      sa.Integer),
        sa.Column("board",      sa.Text, server_default="CBSE"),
        sa.Column("difficulty", sa.Text, server_default="medium"),
        sa.Column("language",   sa.Text, server_default="en"),
        sa.Column("source",     sa.Text, server_default="text"),
        sa.Column("solve_time_ms", sa.Integer),
        sa.Column("created_at", sa.TIMESTAMPTZ, server_default=sa.text("now()")),
    )
    op.create_index("idx_questions_user",    "questions", ["user_id"])
    op.create_index("idx_questions_subject", "questions", ["subject"])
    op.create_index("idx_questions_created", "questions", ["created_at"])

    op.create_table("solutions",
        sa.Column("id",                 UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("question_id",        UUID(as_uuid=True), sa.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("steps",              sa.JSON, nullable=False, server_default="[]"),
        sa.Column("final_answer",       sa.Text, nullable=False),
        sa.Column("confidence",         sa.Float, server_default="0.95"),
        sa.Column("model_used",         sa.Text),
        sa.Column("concept_tags",       sa.ARRAY(sa.Text), server_default="{}"),
        sa.Column("related_pyqs",       sa.ARRAY(sa.Text), server_default="{}"),
        sa.Column("alternative_method", sa.Text),
        sa.Column("review_verdict",     sa.Text),
        sa.Column("review_score",       sa.Integer),
        sa.Column("from_cache",         sa.Boolean, server_default="false"),
        sa.Column("created_at",         sa.TIMESTAMPTZ, server_default=sa.text("now()")),
    )
    op.create_index("idx_solutions_question", "solutions", ["question_id"])

    op.create_table("solution_ratings",
        sa.Column("id",          UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("solution_id", UUID(as_uuid=True), sa.ForeignKey("solutions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id",     UUID(as_uuid=True), sa.ForeignKey("users.id",     ondelete="CASCADE"), nullable=False),
        sa.Column("rating",      sa.Integer, nullable=False),
        sa.Column("feedback",    sa.Text),
        sa.Column("created_at",  sa.TIMESTAMPTZ, server_default=sa.text("now()")),
        sa.UniqueConstraint("solution_id", "user_id", name="uq_rating_solution_user"),
    )

    op.create_table("subscriptions",
        sa.Column("id",                      UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id",                 UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("plan",                    sa.Text, nullable=False),
        sa.Column("billing_cycle",           sa.Text, nullable=False),
        sa.Column("amount_inr",              sa.Integer, nullable=False),
        sa.Column("razorpay_subscription_id",sa.Text),
        sa.Column("razorpay_payment_id",     sa.Text),
        sa.Column("status",                  sa.Text, server_default="active"),
        sa.Column("starts_at",               sa.TIMESTAMPTZ, server_default=sa.text("now()")),
        sa.Column("expires_at",              sa.TIMESTAMPTZ, nullable=False),
        sa.Column("cancelled_at",            sa.TIMESTAMPTZ),
        sa.Column("created_at",              sa.TIMESTAMPTZ, server_default=sa.text("now()")),
    )
    op.create_index("idx_subscriptions_user",   "subscriptions", ["user_id"])
    op.create_index("idx_subscriptions_status", "subscriptions", ["status"])

    op.create_table("user_progress",
        sa.Column("id",               UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id",          UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date",             sa.Date, nullable=False, server_default=sa.text("CURRENT_DATE")),
        sa.Column("questions_solved", sa.Integer, server_default="0"),
        sa.Column("correct_count",    sa.Integer, server_default="0"),
        sa.Column("subjects_data",    sa.JSON, server_default="{}"),
        sa.Column("weak_topics",      sa.ARRAY(sa.Text), server_default="{}"),
        sa.Column("study_minutes",    sa.Integer, server_default="0"),
        sa.UniqueConstraint("user_id", "date", name="uq_progress_user_date"),
    )
    op.create_index("idx_progress_user_date", "user_progress", ["user_id", "date"])

    op.create_table("learn_mode_attempts",
        sa.Column("id",               UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id",          UUID(as_uuid=True), sa.ForeignKey("users.id",      ondelete="CASCADE"), nullable=False),
        sa.Column("question_id",      UUID(as_uuid=True), sa.ForeignKey("questions.id",  ondelete="CASCADE"), nullable=False),
        sa.Column("student_response", sa.Text, nullable=False),
        sa.Column("score",            sa.Integer, server_default="0"),
        sa.Column("passed",           sa.Boolean, server_default="false"),
        sa.Column("feedback",         sa.Text),
        sa.Column("created_at",       sa.TIMESTAMPTZ, server_default=sa.text("now()")),
    )

    op.create_table("otp_store",
        sa.Column("phone",      sa.Text, primary_key=True),
        sa.Column("otp",        sa.Text, nullable=False),
        sa.Column("expires_at", sa.TIMESTAMPTZ, nullable=False),
        sa.Column("created_at", sa.TIMESTAMPTZ, server_default=sa.text("now()")),
    )

    op.create_table("solution_cache",
        sa.Column("cache_key",  sa.Text, primary_key=True),
        sa.Column("result",     sa.JSON, nullable=False),
        sa.Column("hit_count",  sa.Integer, server_default="1"),
        sa.Column("created_at", sa.TIMESTAMPTZ, server_default=sa.text("now()")),
        sa.Column("expires_at", sa.TIMESTAMPTZ, server_default=sa.text("now() + interval '72 hours'")),
    )
    op.create_index("idx_cache_expires", "solution_cache", ["expires_at"])


def downgrade():
    for t in ("solution_cache", "otp_store", "learn_mode_attempts", "user_progress",
              "subscriptions", "solution_ratings", "solutions", "questions", "users"):
        op.drop_table(t)
