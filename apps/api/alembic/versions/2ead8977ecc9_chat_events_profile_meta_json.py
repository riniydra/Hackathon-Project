"""chat_events + profile + meta_json

Revision ID: 2ead8977ecc9
Revises: 
Create Date: 2025-09-09 17:42:44.759296

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = '2ead8977ecc9'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
def _has_column(conn, table, column):
    return conn.execute(
        text("SELECT 1 FROM information_schema.columns WHERE table_name=:t AND column_name=:c"),
        {"t": table, "c": column},
    ).first() is not None

def _has_table(conn, table):
    return conn.execute(
        text("SELECT to_regclass(:t)"),
        {"t": table},
    ).scalar() is not None

def upgrade() -> None:
    conn = op.get_bind()

    # chat_events
    if not _has_table(conn, "chat_events"):
        op.create_table(
            "chat_events",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("event_id", sa.String(32), nullable=False, index=True),
            sa.Column("chat_id", sa.String(64), nullable=False, index=True),
            sa.Column("user_id", sa.String(64), nullable=False, index=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("journal_entry", sa.Text),
            sa.Column("entry_source", sa.String(32)),
            sa.Column("jurisdiction", sa.String(128)),
            sa.Column("location_type", sa.String(32)),
            sa.Column("children_present", sa.Boolean),
            sa.Column("event_type", sa.String(64)),
            sa.Column("type_of_abuse", sa.String(64)),
            sa.Column("sentiment_score", sa.Float),
            sa.Column("risk_points", sa.Integer),
            sa.Column("severity_score", sa.Integer),
            sa.Column("escalation_index", sa.Float),
            sa.Column("threats_to_kill", sa.Boolean),
            sa.Column("strangulation", sa.Boolean),
            sa.Column("weapon_involved", sa.Boolean),
            sa.Column("stalking", sa.Boolean),
            sa.Column("digital_surveillance", sa.Boolean),
            sa.Column("model_summary", sa.Text),
            sa.Column("confidentiality_level", sa.String(32)),
            sa.Column("share_with", sa.String(32)),
            sa.Column("extra_json", sa.Text),
        )
        op.create_index("ix_chat_events_user_ts", "chat_events", ["user_id", "created_at"])
        op.create_index("ix_chat_events_type_ts", "chat_events", ["event_type", "created_at"])

    # users columns (skip if already present)
    for col, typ in [
        ("age", sa.Integer()),
        ("gender", sa.String(50)),
        ("relationship_status", sa.String(50)),
        ("default_confidentiality", sa.String(32)),
        ("default_share_with", sa.String(32)),
        ("victim_housing", sa.String(32)),
        ("has_trusted_support", sa.Boolean()),
        ("safety_plan_last_updated", sa.DateTime(timezone=True)),
    ]:
        if not _has_column(conn, "users", col):
            op.add_column("users", sa.Column(col, typ, nullable=True))

    # chat_messages meta_json
    if not _has_column(conn, "chat_messages", "meta_json"):
        with op.batch_alter_table("chat_messages") as b:
            b.add_column(sa.Column("meta_json", sa.Text, nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('chat_messages') as b:
        b.drop_column('meta_json')
    op.drop_column('users', 'safety_plan_last_updated')
    op.drop_column('users', 'has_trusted_support')
    op.drop_column('users', 'victim_housing')
    op.drop_column('users', 'default_share_with')
    op.drop_column('users', 'default_confidentiality')
    op.drop_column('users', 'relationship_status')
    op.drop_column('users', 'gender')
    op.drop_column('users', 'age')
    op.drop_index('ix_chat_events_type_ts', table_name='chat_events')
    op.drop_index('ix_chat_events_user_ts', table_name='chat_events')
    op.drop_table('chat_events')
