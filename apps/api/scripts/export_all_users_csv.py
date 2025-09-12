import csv
from pathlib import Path
from datetime import datetime

import sys
from pathlib import Path as _Path
ROOT = _Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db import SessionLocal, engine, Base
from app import models
from sqlalchemy import text as sql_text


def main():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    out_dir = Path(__file__).resolve().parents[2] / "exports" / "tableau_manual"
    out_dir.mkdir(parents=True, exist_ok=True)
    today = datetime.utcnow().date().isoformat()
    out_path = out_dir / f"users_flat_{today}.csv"

    with out_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([
            # user profile
            "user_id","email","created_at","age","gender","relationship_status","num_children",
            "victim_housing","has_trusted_support","default_confidentiality","default_share_with",
            # latest snapshot
            "risk_score","risk_level","snapshot_at",
            # aggregates
            "journals_count","events_count","events_last7","avg_sentiment","avg_risk_points",
            # recent risk context (most recent non-null)
            "recent_escalation","threats_to_kill","weapon_involved","substance_use",
        ])

        users = session.query(models.User).all()
        for u in users:
            # latest risk snapshot
            snap = session.execute(sql_text(
                "SELECT risk_score, risk_level, created_at FROM risk_snapshots WHERE user_id=:uid ORDER BY created_at DESC LIMIT 1"
            ), {"uid": str(u.id)}).first()

            # aggregates
            agg = session.execute(sql_text(
                "SELECT COUNT(*) AS journals_count FROM journals WHERE user_id=:uid"
            ), {"uid": str(u.id)}).first()
            evt_total = session.execute(sql_text(
                "SELECT COUNT(*) AS c FROM chat_events WHERE user_id=:uid"
            ), {"uid": str(u.id)}).scalar() or 0
            evt_7 = session.execute(sql_text(
                "SELECT COUNT(*) AS c FROM chat_events WHERE user_id=:uid AND created_at >= now() - interval '7 days'"
            ), {"uid": str(u.id)}).scalar() or 0
            sent_avg = session.execute(sql_text(
                "SELECT AVG(sentiment_score) FROM chat_events WHERE user_id=:uid"
            ), {"uid": str(u.id)}).scalar()
            risk_avg = session.execute(sql_text(
                "SELECT AVG(risk_points) FROM chat_events WHERE user_id=:uid"
            ), {"uid": str(u.id)}).scalar()

            # recent context fields
            ctx = session.execute(sql_text(
                """
                SELECT threats_to_kill, weapon_involved, extra_json
                FROM chat_events
                WHERE user_id=:uid
                ORDER BY created_at DESC
                LIMIT 10
                """
            ), {"uid": str(u.id)}).fetchall()
            recent_escalation = ""
            threats_flag = ""
            weapon_flag = ""
            substance_use = ""
            for row in ctx:
                if threats_flag == "" and row.threats_to_kill is not None:
                    threats_flag = str(bool(row.threats_to_kill))
                if weapon_flag == "" and row.weapon_involved is not None:
                    weapon_flag = str(bool(row.weapon_involved))
                if (recent_escalation == "" or substance_use == "") and row.extra_json:
                    try:
                        import json
                        ej = json.loads(row.extra_json)
                        if recent_escalation == "" and ej.get("recent_escalation") is not None:
                            recent_escalation = str(ej.get("recent_escalation"))
                        if substance_use == "" and ej.get("substance_use") is not None:
                            substance_use = str(ej.get("substance_use"))
                    except Exception:
                        pass
                if threats_flag and weapon_flag and recent_escalation and substance_use:
                    break

            w.writerow([
                u.id,
                u.email,
                getattr(u, "created_at", None).isoformat() if getattr(u, "created_at", None) else "",
                getattr(u, "age", ""),
                getattr(u, "gender", ""),
                getattr(u, "relationship_status", ""),
                getattr(u, "num_children", ""),
                getattr(u, "victim_housing", ""),
                getattr(u, "has_trusted_support", ""),
                getattr(u, "default_confidentiality", ""),
                getattr(u, "default_share_with", ""),
                snap.risk_score if snap else "",
                snap.risk_level if snap else "",
                snap.created_at.isoformat() if snap and snap.created_at else "",
                agg.journals_count if agg else 0,
                evt_total,
                evt_7,
                f"{sent_avg:.3f}" if sent_avg is not None else "",
                f"{risk_avg:.3f}" if risk_avg is not None else "",
                recent_escalation,
                threats_flag,
                weapon_flag,
                substance_use,
            ])

    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()


