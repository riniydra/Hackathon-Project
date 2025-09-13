from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, text as sql_text
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from ..db import get_db
from .. import models
from ..auth import get_current_user_id
from ..crypto import decrypt_text
import yaml
from pathlib import Path
import re

router = APIRouter()

RULES_PATH = Path(__file__).resolve().parents[2] / "risk_rules.yaml"

class RiskEvaluator:
    def __init__(self, rules_path: Path):
        self.rules = self._load_rules(rules_path)
        self.weights = self.rules.get('weights', {})
        self.thresholds = self.rules.get('thresholds', {})
        self.features = self.rules.get('features', {})
    
    def _load_rules(self, rules_path: Path) -> Dict[str, Any]:
        """Load and parse risk rules from YAML file (try multiple locations)."""
        candidates = [
            rules_path,
            Path("/app/risk_rules.yaml"),
            Path(__file__).resolve().parents[1] / "risk_rules.yaml",
            Path.cwd() / "risk_rules.yaml",
        ]
        for p in candidates:
            try:
                if p.exists():
                    data = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
                    if data:
                        print(f"Loaded risk rules from {p}")
                        return data
            except Exception as e:
                print(f"Error loading risk rules from {p}: {e}")
        print(f"No risk rules found. Tried: {[str(c) for c in candidates]}")
        return {}
    
    def evaluate_user_risk(self, db: Session, user_id: str) -> Dict[str, Any]:
        """Evaluate risk for a specific user"""
        if not self.rules:
            return {"score": 0.0, "reasons": ["No risk rules loaded"], "level": "unknown"}
        
        feature_scores = {}
        reasons = []
        
        # Calculate each feature score
        for feature_name, feature_rule in self.features.items():
            score, reason = self._evaluate_feature(db, user_id, feature_name, feature_rule)
            feature_scores[feature_name] = score
            if reason:
                reasons.append(reason)
        
        # Calculate weighted score; allow protective (negative weight) features
        # Normalize ONLY by the weights of features that actually produced a signal (score > 0),
        # so a single strong indicator (e.g., suicidality) is not diluted by unrelated features.
        risk_sum = 0.0
        weight_sum = 0.0
        for feature_name, score in feature_scores.items():
            weight = float(self.weights.get(feature_name, 0.0))
            if score and score > 0:
                risk_sum += score * weight
                weight_sum += abs(weight)

        # Normalize by active weights and clamp 0..1
        final_score = (risk_sum / weight_sum) if weight_sum > 0 else 0.0
        final_score = max(0.0, min(1.0, final_score))
        
        # Determine risk level
        risk_level = self._determine_risk_level(final_score)
        
        return {
            "score": round(final_score, 3),
            "level": risk_level,
            "reasons": reasons,
            "feature_scores": feature_scores,
            "weights": self.weights,
            "thresholds": self.thresholds
        }
    
    def _evaluate_feature(self, db: Session, user_id: str, feature_name: str, feature_rule: str) -> tuple[float, Optional[str]]:
        """Evaluate a single feature based on the rule"""
        try:
            if feature_name == "mood_drop_7d":
                return self._evaluate_mood_drop(db, user_id)
            elif feature_name == "safety_low":
                return self._evaluate_safety_low(db, user_id)
            elif feature_name == "negative_language":
                return self._evaluate_negative_language(db, user_id)
            elif feature_name == "positive_affect_7d":
                return self._evaluate_positive_affect_7d(db, user_id)
            elif feature_name == "missed_checkins":
                return self._evaluate_missed_checkins(db, user_id)
            elif feature_name == "game_telemetry_stress":
                return self._evaluate_game_stress(db, user_id)
            elif feature_name == "chat_negative_language":
                return self._evaluate_chat_negative_language(db, user_id)
            elif feature_name == "chat_positive_affect":
                return self._evaluate_chat_positive_affect(db, user_id)
            elif feature_name == "suicidality":
                return self._evaluate_suicidality(db, user_id)
            elif feature_name == "safety_planning_intent":
                return self._evaluate_safety_planning_intent(db, user_id)
            elif feature_name == "journal_neg_30d":
                return self._evaluate_journal_neg_30d(db, user_id)
            elif feature_name == "chat_neg_30d":
                return self._evaluate_chat_neg_30d(db, user_id)
            elif feature_name == "worsening_vs_baseline":
                return self._evaluate_worsening_vs_baseline(db, user_id)
            elif feature_name == "suicidality_sticky":
                return self._evaluate_suicidality_sticky(db, user_id)
            elif feature_name == "weapon_indicator":
                return self._evaluate_weapon_indicator(db, user_id)
            elif feature_name == "stalking_indicator":
                return self._evaluate_simple_phrase_indicator(db, user_id, ["stalking","follows me","shows up","waiting outside","keeps appearing"], label="stalking indicators")
            elif feature_name == "digital_surveillance_indicator":
                return self._evaluate_simple_phrase_indicator(db, user_id, ["spyware","installed app","tracking app","location sharing","screen mirroring","phone monitored","passwords demanded"], label="digital surveillance indicators")
            else:
                return 0.0, f"Unknown feature: {feature_name}"
        except Exception as e:
            return 0.0, f"Error evaluating {feature_name}: {str(e)}"
    
    def _evaluate_mood_drop(self, db: Session, user_id: str) -> tuple[float, Optional[str]]:
        """Evaluate mood drop over 7 days"""
        # Get recent journals (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_journals = db.query(models.Journal).filter(
            and_(
                models.Journal.user_id == user_id,
                models.Journal.created_at >= week_ago
            )
        ).all()
        
        if len(recent_journals) < 2:
            return 0.0, None  # Not enough data
        
        # Enhanced sentiment analysis with more words
        negative_words = ['sad', 'angry', 'depressed', 'anxious', 'worried', 'scared', 'hurt', 'pain', 'hate', 'terrible', 'awful', 'horrible', 'miserable', 'lonely', 'hopeless', 'worthless', 'guilty', 'ashamed', 'fear', 'panic', 'stress', 'tension', 'frustrated', 'annoyed', 'irritated', 'upset', 'disappointed', 'heartbroken', 'devastated', 'crushed', 'defeated']
        positive_words = ['happy', 'joy', 'excited', 'good', 'great', 'wonderful', 'peaceful', 'calm', 'love', 'amazing', 'fantastic', 'beautiful', 'blessed', 'grateful', 'thankful', 'content', 'satisfied', 'fulfilled', 'accomplished', 'proud', 'confident', 'optimistic', 'hopeful', 'inspired', 'motivated', 'energetic', 'vibrant', 'alive', 'thriving', 'prosperous', 'successful']
        
        total_sentiment = 0
        valid_journals = 0
        
        for journal in recent_journals:
            try:
                # Decrypt the journal text
                decrypted_text = decrypt_text(journal.ciphertext_b64, journal.iv_b64)
                text_lower = decrypted_text.lower()
                
                negative_count = sum(1 for word in negative_words if word in text_lower)
                positive_count = sum(1 for word in positive_words if word in text_lower)
                
                # Calculate sentiment score (-1 to 1)
                total_words = len(decrypted_text.split())
                if total_words > 0:
                    sentiment = (positive_count - negative_count) / total_words
                    total_sentiment += sentiment
                    valid_journals += 1
            except Exception as e:
                print(f"Error decrypting journal {journal.id}: {e}")
                continue
        
        if valid_journals == 0:
            return 0.0, None
        
        avg_sentiment = total_sentiment / valid_journals
        
        # If average sentiment is negative, consider it a mood drop
        if avg_sentiment < -0.05:
            return 0.8, f"Mood appears low based on recent journal entries"
        elif avg_sentiment < 0:
            return 0.4, f"Slightly negative mood in recent entries"
        
        return 0.0, None

    def _evaluate_positive_affect_7d(self, db: Session, user_id: str) -> tuple[float, Optional[str]]:
        """Positive affect feature from journals that can reduce risk via negative weight."""
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent = db.query(models.Journal).filter(
            and_(models.Journal.user_id == user_id, models.Journal.created_at >= week_ago)
        ).all()
        if not recent:
            return 0.0, None
        pos_words = ['grateful','thankful','calm','safe','relief','supported','hopeful','optimistic','better','improving','progress']
        hits = 0
        total = 0
        for j in recent:
            try:
                t = decrypt_text(j.ciphertext_b64, j.iv_b64).lower()
                hits += sum(1 for w in pos_words if w in t)
                total += max(1, len(t.split()) // 50)
            except Exception:
                continue
        ratio = hits / max(1, total)
        if ratio >= 0.2:
            return 0.8, "positive affect present in journals"
        if ratio >= 0.1:
            return 0.5, "some positive affect in journals"
        return 0.0, None

    def _evaluate_suicidality(self, db: Session, user_id: str) -> tuple[float, Optional[str]]:
        """Hard-raise score if explicit self-harm phrases appear in journals or chat in last 30 days.
        Returns a strong feature score and reason if detected.
        """
        window = datetime.utcnow() - timedelta(days=30)

        phrases = [
            'kill myself','end my life','i want to die','want to die','suicide',
            'take my life','i am going to kill myself','end it all','no reason to live',
            'i want to end it','i can\'t go on','i don\'t want to live','die by suicide',
            'end myself','going to end myself','end myself tonight'
        ]

        # Check journals
        j_hits = 0
        recent_journals = db.query(models.Journal).filter(
            and_(models.Journal.user_id == user_id, models.Journal.created_at >= window)
        ).all()
        for j in recent_journals:
            try:
                t = decrypt_text(j.ciphertext_b64, j.iv_b64).lower()
                if any(p in t for p in phrases):
                    j_hits += 1
            except Exception:
                continue

        # Check chat messages (user only)
        c_hits = 0
        recent_msgs = db.query(models.ChatMessage).filter(
            and_(
                models.ChatMessage.user_id == user_id,
                models.ChatMessage.created_at >= window,
                models.ChatMessage.role == 'user'
            )
        ).all()
        for m in recent_msgs:
            try:
                t = decrypt_text(m.ciphertext_b64, m.iv_b64).lower()
                if any(p in t for p in phrases):
                    c_hits += 1
            except Exception:
                continue

        total = j_hits + c_hits
        if total == 0:
            return 0.0, None

        # Strong signal; map counts to near-1 quickly
        score = min(1.0, 0.8 + 0.1 * (total - 1))
        reason = "explicit self-harm language detected"
        return score, reason

    def _evaluate_weapon_indicator(self, db: Session, user_id: str) -> tuple[float, Optional[str]]:
        """Detect weapon presence in journals or chat within 30 days (e.g., 'gun', 'knife', 'weapon')."""
        window = datetime.utcnow() - timedelta(days=30)
        words = ["gun","knife","weapon","armed","pistol","rifle","shotgun","revolver","gun in the house","has a gun"]
        hits = 0
        # journals
        js = db.query(models.Journal).filter(and_(models.Journal.user_id==user_id, models.Journal.created_at>=window)).all()
        for j in js:
            try:
                t = decrypt_text(j.ciphertext_b64, j.iv_b64).lower()
                if any(w in t for w in words):
                    hits += 1
            except Exception:
                pass
        # chat (user)
        cs = db.query(models.ChatMessage).filter(and_(models.ChatMessage.user_id==user_id, models.ChatMessage.created_at>=window, models.ChatMessage.role=='user')).all()
        for m in cs:
            try:
                t = decrypt_text(m.ciphertext_b64, m.iv_b64).lower()
                if any(w in t for w in words):
                    hits += 1
            except Exception:
                pass
        if hits == 0:
            return 0.0, None
        score = min(1.0, 0.6 + 0.1*(hits-1))
        return score, "weapon indicators mentioned"

    def _evaluate_simple_phrase_indicator(self, db: Session, user_id: str, phrases: list[str], label: str) -> tuple[float, Optional[str]]:
        """Generic indicator for journals+chat with modest weight; returns moderate score when phrases found."""
        window = datetime.utcnow() - timedelta(days=30)
        hits = 0
        js = db.query(models.Journal).filter(and_(models.Journal.user_id==user_id, models.Journal.created_at>=window)).all()
        for j in js:
            try:
                t = decrypt_text(j.ciphertext_b64, j.iv_b64).lower()
                if any(p in t for p in phrases):
                    hits += 1
            except Exception:
                pass
        cs = db.query(models.ChatMessage).filter(and_(models.ChatMessage.user_id==user_id, models.ChatMessage.created_at>=window, models.ChatMessage.role=='user')).all()
        for m in cs:
            try:
                t = decrypt_text(m.ciphertext_b64, m.iv_b64).lower()
                if any(p in t for p in phrases):
                    hits += 1
            except Exception:
                pass
        if hits == 0:
            return 0.0, None
        score = min(1.0, 0.4 + 0.1*(hits-1))
        return score, label
    
    def _evaluate_safety_low(self, db: Session, user_id: str) -> tuple[float, Optional[str]]:
        """Evaluate if safety level is low"""
        # Until we wire real safety check-ins, do not assume risk.
        # New users should not start with elevated safety risk.
        return 0.0, None
    
    def _evaluate_negative_language(self, db: Session, user_id: str) -> tuple[float, Optional[str]]:
        """Evaluate negative language in recent journals"""
        # Get recent journals
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_journals = db.query(models.Journal).filter(
            and_(
                models.Journal.user_id == user_id,
                models.Journal.created_at >= week_ago
            )
        ).all()
        
        if not recent_journals:
            return 0.0, None
        
        # Enhanced negative words and concerning phrases
        negative_words = ['hate', 'kill', 'die', 'suicide', 'end', 'stop', 'can\'t', 'won\'t', 'never', 'hopeless', 'worthless', 'useless', 'pointless', 'meaningless', 'empty', 'void', 'dark', 'black', 'death', 'dead', 'burden', 'tired', 'exhausted', 'drained', 'numb', 'numbness', 'pain', 'suffering', 'agony', 'torment', 'hell', 'nightmare']
        concerning_phrases = ['want to die', 'end it all', 'give up', 'no point', 'better off dead', 'kill myself', 'end my life', 'take my life', 'no reason to live', 'life is meaningless', 'i hate myself', 'i\'m worthless', 'i\'m useless', 'i can\'t take it anymore', 'i can\'t go on', 'i\'m done', 'i give up', 'i quit', 'i surrender', 'i\'m broken', 'i\'m damaged', 'i\'m ruined', 'i\'m destroyed']
        
        total_negative_score = 0
        valid_journals = 0
        
        for journal in recent_journals:
            try:
                # Decrypt the journal text
                decrypted_text = decrypt_text(journal.ciphertext_b64, journal.iv_b64)
                text_lower = decrypted_text.lower()
                
                # Count negative words
                negative_count = sum(1 for word in negative_words if word in text_lower)
                
                # Check for concerning phrases
                concerning_count = sum(1 for phrase in concerning_phrases if phrase in text_lower)
                
                # Calculate negative score
                negative_score = (negative_count * 0.1) + (concerning_count * 0.5)
                total_negative_score += negative_score
                valid_journals += 1
            except Exception as e:
                print(f"Error decrypting journal {journal.id}: {e}")
                continue
        
        if valid_journals == 0:
            return 0.0, None
        
        avg_negative_score = total_negative_score / valid_journals
        
        if avg_negative_score > 0.3:
            return 0.9, f"Concerning language detected in recent journals"
        elif avg_negative_score > 0.1:
            return 0.6, f"Some negative language in recent journals"
        
        return 0.0, None

    def _evaluate_chat_negative_language(self, db: Session, user_id: str) -> tuple[float, Optional[str]]:
        """Evaluate negative indicators from recent chat messages (last 7 days).
        Prefer chat_events (denormalized) and fall back to chat_messages if none.
        """
        week_ago = datetime.utcnow() - timedelta(days=7)

        # Try events first
        events = db.execute(sql_text(
            """
            SELECT sentiment_score, threats_to_kill, strangulation, weapon_involved
            FROM chat_events
            WHERE user_id = :uid AND created_at >= :since
            ORDER BY created_at DESC
            LIMIT 100
            """
        ), {"uid": user_id, "since": week_ago}).fetchall()

        if events:
            neg_components = [max(0.0, -float(e[0])) for e in events if e[0] is not None]
            flag_hits = sum(1 for e in events if any([bool(e[1]), bool(e[2]), bool(e[3])]))
            if not neg_components and flag_hits == 0:
                return 0.0, None
            avg_neg = sum(neg_components) / max(1, len(neg_components))
            flag_ratio = flag_hits / max(1, len(events))
            score = min(1.0, (flag_ratio * 0.9) + (avg_neg * 0.6))
            reasons = []
            if flag_hits:
                reasons.append(f"{flag_hits} high-risk indicators in chat")
            if avg_neg > 0.15:
                reasons.append("negative chat sentiment")
            return score, ", ".join(reasons) if reasons else None

        # Fallback to chat_messages
        recent_msgs = db.query(models.ChatMessage).filter(
            and_(
                models.ChatMessage.user_id == user_id,
                models.ChatMessage.created_at >= week_ago,
                models.ChatMessage.role == "user"
            )
        ).order_by(models.ChatMessage.created_at.desc()).limit(50).all()

        if not recent_msgs:
            return 0.0, None

        neg_components = []
        flag_hits = 0
        for m in recent_msgs:
            if m.sentiment_score is not None:
                neg_components.append(max(0.0, -float(m.sentiment_score)))
            if any([bool(m.threats_to_kill), bool(m.strangulation), bool(m.weapon_involved)]):
                flag_hits += 1
        if not neg_components and flag_hits == 0:
            return 0.0, None
        avg_neg = sum(neg_components) / max(1, len(neg_components))
        flag_ratio = flag_hits / max(1, len(recent_msgs))
        score = min(1.0, (flag_ratio * 0.9) + (avg_neg * 0.6))
        reasons = []
        if flag_hits:
            reasons.append(f"{flag_hits} high-risk indicators in chat")
        if avg_neg > 0.15:
            reasons.append("negative chat sentiment")
        return score, ", ".join(reasons) if reasons else None

    def _evaluate_chat_positive_affect(self, db: Session, user_id: str) -> tuple[float, Optional[str]]:
        """Positive affect in chat messages; reduces risk via negative weight."""
        week_ago = datetime.utcnow() - timedelta(days=7)
        msgs = db.query(models.ChatMessage).filter(
            and_(
                models.ChatMessage.user_id == user_id,
                models.ChatMessage.created_at >= week_ago,
                models.ChatMessage.role == 'user'
            )
        ).all()
        if not msgs:
            return 0.0, None
        pos_vals = [float(m.sentiment_score) for m in msgs if m.sentiment_score is not None and m.sentiment_score > 0]
        if not pos_vals:
            return 0.0, None
        avg_pos = sum(pos_vals) / len(pos_vals)
        score = min(1.0, max(0.0, avg_pos))
        if score >= 0.3:
            return score, "positive affect in chat"
        return 0.0, None

    def _evaluate_safety_planning_intent(self, db: Session, user_id: str) -> tuple[float, Optional[str]]:
        """Protective feature: frequency of 'safety_planning' intent in last 30 days of user chat."""
        window = datetime.utcnow() - timedelta(days=30)
        msgs = db.query(models.ChatMessage).filter(
            and_(
                models.ChatMessage.user_id == user_id,
                models.ChatMessage.created_at >= window,
                models.ChatMessage.role == 'user'
            )
        ).all()
        if not msgs:
            return 0.0, None
        total = len(msgs)
        safety_msgs = sum(1 for m in msgs if (m.intent or "") == "safety_planning")
        ratio = safety_msgs / max(1, total)
        if ratio >= 0.5:
            return 0.9, "engaging in safety planning"
        if ratio >= 0.25:
            return 0.6, "safety planning signals present"
        if ratio >= 0.1:
            return 0.3, "some safety planning intent"
        return 0.0, None
    
    def _evaluate_missed_checkins(self, db: Session, user_id: str) -> tuple[float, Optional[str]]:
        """Evaluate missed check-ins"""
        # For MVP, we'll use a placeholder
        # In production, this would check actual check-in data
        return 0.1, "Check-in pattern appears regular (placeholder evaluation)"
    
    def _evaluate_game_stress(self, db: Session, user_id: str) -> tuple[float, Optional[str]]:
        """Evaluate stress indicators from game telemetry"""
        # For MVP, we'll use a placeholder
        # In production, this would analyze breath garden telemetry
        return 0.0, None  # No game telemetry data available yet

    # --- Long-horizon and trend features ---
    def _evaluate_journal_neg_30d(self, db: Session, user_id: str) -> tuple[float, Optional[str]]:
        window = datetime.utcnow() - timedelta(days=30)
        rows = db.query(models.Journal).filter(and_(models.Journal.user_id==user_id, models.Journal.created_at>=window)).all()
        if not rows:
            return 0.0, None
        neg_words = ['sad','angry','depressed','anxious','scared','hopeless','worthless','pain','panic','fear','abuse','hurt']
        neg_hits = 0
        denom = 0
        for j in rows:
            try:
                t = decrypt_text(j.ciphertext_b64, j.iv_b64).lower()
                neg_hits += sum(1 for w in neg_words if w in t)
                denom += max(1, len(t.split())//50)
            except Exception:
                continue
        ratio = neg_hits/max(1,denom)
        if ratio>=0.1:
            return 0.7, "sustained negative language in journals (30d)"
        if ratio>=0.05:
            return 0.4, "some negative language in journals (30d)"
        return 0.0, None

    def _evaluate_chat_neg_30d(self, db: Session, user_id: str) -> tuple[float, Optional[str]]:
        window = datetime.utcnow() - timedelta(days=30)
        msgs = db.query(models.ChatMessage).filter(and_(models.ChatMessage.user_id==user_id, models.ChatMessage.created_at>=window, models.ChatMessage.role=='user')).all()
        if not msgs:
            return 0.0, None
        neg_vals = [max(0.0, -float(m.sentiment_score)) for m in msgs if m.sentiment_score is not None]
        if not neg_vals:
            return 0.0, None
        avg = sum(neg_vals)/len(neg_vals)
        if avg>=0.3:
            return 0.6, "sustained negative chat sentiment (30d)"
        if avg>=0.15:
            return 0.3, "negative chat sentiment (30d)"
        return 0.0, None

    def _evaluate_worsening_vs_baseline(self, db: Session, user_id: str) -> tuple[float, Optional[str]]:
        """Compare current 7d negative signals vs a 90d baseline (journals+chat)."""
        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)
        ninety_ago = now - timedelta(days=90)
        # 7d avg negative (journals + chat)
        week_neg = []
        # journals
        j7 = db.query(models.Journal).filter(and_(models.Journal.user_id==user_id, models.Journal.created_at>=week_ago)).all()
        for j in j7:
            try:
                t = decrypt_text(j.ciphertext_b64, j.iv_b64).lower()
                week_neg.append(1.0 if any(x in t for x in ['hurt','afraid','unsafe','kill','die','panic','threat']) else 0.0)
            except Exception:
                pass
        # chat
        c7 = db.query(models.ChatMessage).filter(and_(models.ChatMessage.user_id==user_id, models.ChatMessage.created_at>=week_ago, models.ChatMessage.role=='user')).all()
        for m in c7:
            if m.sentiment_score is not None:
                week_neg.append(max(0.0, -float(m.sentiment_score)))
        week_avg = sum(week_neg)/max(1,len(week_neg))

        # 90d baseline
        base_vals = []
        j90 = db.query(models.Journal).filter(and_(models.Journal.user_id==user_id, models.Journal.created_at>=ninety_ago)).all()
        for j in j90:
            try:
                t = decrypt_text(j.ciphertext_b64, j.iv_b64).lower()
                base_vals.append(1.0 if any(x in t for x in ['hurt','afraid','unsafe','kill','die','panic','threat']) else 0.0)
            except Exception:
                pass
        c90 = db.query(models.ChatMessage).filter(and_(models.ChatMessage.user_id==user_id, models.ChatMessage.created_at>=ninety_ago, models.ChatMessage.role=='user')).all()
        for m in c90:
            if m.sentiment_score is not None:
                base_vals.append(max(0.0, -float(m.sentiment_score)))
        base_avg = sum(base_vals)/max(1,len(base_vals))

        delta = week_avg - base_avg
        if delta >= 0.2:
            return 0.8, "worsening vs 90d baseline"
        if delta >= 0.1:
            return 0.5, "slightly worse vs 90d baseline"
        return 0.0, None

    def _evaluate_suicidality_sticky(self, db: Session, user_id: str) -> tuple[float, Optional[str]]:
        """Keep elevated risk for 14 days after any suicidality detection."""
        window = datetime.utcnow() - timedelta(days=14)
        phrases = ['kill myself','end my life','i want to die','suicide','take my life','end it all','no reason to live']
        # journals
        j = db.query(models.Journal).filter(and_(models.Journal.user_id==user_id, models.Journal.created_at>=window)).all()
        for r in j:
            try:
                if any(p in decrypt_text(r.ciphertext_b64, r.iv_b64).lower() for p in phrases):
                    return 0.9, "recent suicidality (sticky)"
            except Exception:
                pass
        # chat
        c = db.query(models.ChatMessage).filter(and_(models.ChatMessage.user_id==user_id, models.ChatMessage.created_at>=window, models.ChatMessage.role=='user')).all()
        for m in c:
            try:
                if any(p in decrypt_text(m.ciphertext_b64, m.iv_b64).lower() for p in phrases):
                    return 0.9, "recent suicidality (sticky)"
            except Exception:
                pass
        return 0.0, None
    
    def _determine_risk_level(self, score: float) -> str:
        """Determine risk level based on score and thresholds"""
        if score >= self.thresholds.get('high', 0.65):
            return 'high'
        elif score >= self.thresholds.get('warn', 0.45):
            return 'warn'
        else:
            return 'low'

# Initialize risk evaluator
risk_evaluator = RiskEvaluator(RULES_PATH)

@router.get("/risk")
def get_risk_score(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Get risk assessment for the current user"""
    print(f"DEBUG: Risk evaluation requested for user_id: {user_id}")
    
    if user_id == "demo":
        print("DEBUG: Returning demo data")
        return {
            "score": 0.0,
            "level": "demo",
            "reasons": ["Demo user - no real assessment"],
            "feature_scores": {},
            "weights": risk_evaluator.weights,
            "thresholds": risk_evaluator.thresholds
        }
    
    print(f"DEBUG: Evaluating risk for real user: {user_id}")
    result = risk_evaluator.evaluate_user_risk(db, user_id)
    print(f"DEBUG: Risk evaluation result: {result}")
    return result

@router.get("/risk/rules")
def get_risk_rules():
    """Get the current risk rules configuration"""
    return {
        "rules": risk_evaluator.rules,
        "weights": risk_evaluator.weights,
        "thresholds": risk_evaluator.thresholds,
        "features": risk_evaluator.features
    }
