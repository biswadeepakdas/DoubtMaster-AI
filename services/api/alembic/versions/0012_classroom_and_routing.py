"""Add classroom sessions, topic mastery, LLM routing log, refresh tokens, audit log."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "0012"
down_revision = "0001"

def upgrade():

    # ── Refresh tokens (Auth Agent will add FK constraints) ────────────────
    op.create_table("refresh_tokens",
        sa.Column("id",          UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id",     UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash",  sa.Text, nullable=False, unique=True),
        sa.Column("family",      sa.Text, nullable=False),          # rotation family for reuse detection
        sa.Column("device_info", sa.Text),
        sa.Column("ip_address",  sa.Text),
        sa.Column("expires_at",  sa.TIMESTAMPTZ, nullable=False),
        sa.Column("revoked_at",  sa.TIMESTAMPTZ),
        sa.Column("created_at",  sa.TIMESTAMPTZ, server_default=sa.text("now()")),
    )
    op.create_index("idx_refresh_tokens_user",   "refresh_tokens", ["user_id"])
    op.create_index("idx_refresh_tokens_family", "refresh_tokens", ["family"])
    op.create_index("idx_refresh_tokens_hash",   "refresh_tokens", ["token_hash"])

    # ── Classroom sessions ──────────────────────────────────────────────────
    op.create_table("classroom_sessions",
        sa.Column("id",                     UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("student_id",             UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("openmaic_job_id",        sa.Text),
        sa.Column("openmaic_classroom_url", sa.Text),
        sa.Column("status",                 sa.Text, nullable=False, server_default="pending"),
        sa.Column("mode",                   sa.Text, nullable=False),
        sa.Column("subject",                sa.Text, nullable=False),
        sa.Column("topic",                  sa.Text, nullable=False),
        sa.Column("syllabus",               sa.Text, nullable=False, server_default="CBSE"),
        sa.Column("grade",                  sa.Text),
        sa.Column("source_question_id",     UUID(as_uuid=True), sa.ForeignKey("questions.id", ondelete="SET NULL")),
        sa.Column("duration_seconds",       sa.Integer),
        sa.Column("completed",              sa.Boolean, server_default="false"),
        sa.Column("error_message",          sa.Text),
        sa.Column("created_at",             sa.TIMESTAMPTZ, server_default=sa.text("now()")),
        sa.Column("updated_at",             sa.TIMESTAMPTZ, server_default=sa.text("now()")),
    )
    op.create_check_constraint("ck_classroom_status", "classroom_sessions",
        "status IN ('pending','generating','ready','failed')")
    op.create_check_constraint("ck_classroom_mode", "classroom_sessions",
        "mode IN ('explain','quiz','pbl','whiteboard')")
    op.create_index("idx_classroom_student",    "classroom_sessions", ["student_id"])
    op.create_index("idx_classroom_status",     "classroom_sessions", ["status"])
    op.create_index("idx_classroom_created_at", "classroom_sessions", ["created_at"])

    # ── Student topic mastery ───────────────────────────────────────────────
    op.create_table("student_topic_mastery",
        sa.Column("id",             UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("student_id",     UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("subject",        sa.Text, nullable=False),
        sa.Column("topic",          sa.Text, nullable=False),
        sa.Column("mastery_score",  sa.Float, server_default="0.5"),
        sa.Column("sessions_count", sa.Integer, server_default="0"),
        sa.Column("last_session_at",sa.TIMESTAMPTZ),
        sa.Column("updated_at",     sa.TIMESTAMPTZ, server_default=sa.text("now()")),
        sa.UniqueConstraint("student_id", "subject", "topic", name="uq_mastery_student_topic"),
    )
    op.create_index("idx_mastery_student", "student_topic_mastery", ["student_id"])

    # ── LLM routing analytics ───────────────────────────────────────────────
    op.create_table("llm_routing_log",
        sa.Column("id",            UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("student_id",    UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("feature",       sa.Text, nullable=False),
        sa.Column("tier",          sa.Integer, nullable=False),
        sa.Column("model",         sa.Text, nullable=False),
        sa.Column("input_tokens",  sa.Integer),
        sa.Column("output_tokens", sa.Integer),
        sa.Column("cache_hit",     sa.Boolean, server_default="false"),
        sa.Column("latency_ms",    sa.Integer),
        sa.Column("created_at",    sa.TIMESTAMPTZ, server_default=sa.text("now()")),
    )
    op.create_check_constraint("ck_routing_tier", "llm_routing_log", "tier IN (1, 2, 3)")
    op.create_index("idx_routing_feature",   "llm_routing_log", ["feature"])
    op.create_index("idx_routing_tier",      "llm_routing_log", ["tier"])
    op.create_index("idx_routing_created",   "llm_routing_log", ["created_at"])

    # ── Audit log (Security Agent requirement) ──────────────────────────────
    op.create_table("audit_log",
        sa.Column("id",         UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id",    UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("action",     sa.Text, nullable=False),          # e.g. "login", "classroom.create"
        sa.Column("resource",   sa.Text),                          # e.g. "classroom_sessions"
        sa.Column("resource_id",sa.Text),
        sa.Column("ip_address", sa.Text),
        sa.Column("user_agent", sa.Text),
        sa.Column("metadata",   JSONB, server_default="{}"),
        sa.Column("created_at", sa.TIMESTAMPTZ, server_default=sa.text("now()")),
    )
    op.create_index("idx_audit_user",    "audit_log", ["user_id"])
    op.create_index("idx_audit_action",  "audit_log", ["action"])
    op.create_index("idx_audit_created", "audit_log", ["created_at"])

    # ── Row-Level Security (RLS) for student data isolation ─────────────────
    op.execute("ALTER TABLE classroom_sessions ENABLE ROW LEVEL SECURITY;")
    op.execute("""
        CREATE POLICY student_isolation ON classroom_sessions
        USING (student_id = current_setting('app.current_user_id', true)::uuid);
    """)
    op.execute("ALTER TABLE student_topic_mastery ENABLE ROW LEVEL SECURITY;")
    op.execute("""
        CREATE POLICY student_isolation ON student_topic_mastery
        USING (student_id = current_setting('app.current_user_id', true)::uuid);
    """)
    op.execute("ALTER TABLE classroom_sessions FORCE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE student_topic_mastery FORCE ROW LEVEL SECURITY;")


def downgrade():
    op.execute("ALTER TABLE student_topic_mastery DISABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE classroom_sessions DISABLE ROW LEVEL SECURITY;")
    op.drop_table("audit_log")
    op.drop_table("llm_routing_log")
    op.drop_table("student_topic_mastery")
    op.drop_table("classroom_sessions")
    op.drop_table("refresh_tokens")
