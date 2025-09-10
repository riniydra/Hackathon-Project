from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from ..db import get_db
from .. import models
from ..auth import get_current_user_id
from ..crypto import decrypt_text
import yaml
from pathlib import Path
import re
import json

router = APIRouter()

RULES_PATH = Path(__file__).resolve().parents[2] / "risk_rules.yaml"

class RiskEvaluator:
    def __init__(self, rules_path: Path):
        self.rules = self._load_rules(rules_path)
        self.weights = self.rules.get('weights', {})
        self.thresholds = self.rules.get('thresholds', {})
        self.features = self.rules.get('features', {})
    
    def _load_rules(self, rules_path: Path) -> Dict[str, Any]:
        """Load and parse risk rules from YAML file"""
        if not rules_path.exists():
            return {}
        try:
            return yaml.safe_load(rules_path.read_text(encoding="utf-8")) or {}
        except Exception as e:
            print(f"Error loading risk rules: {e}")
            return {}
    
    def evaluate_user_risk(self, db: Session, user_id: str, save_snapshot: bool = True) -> Dict[str, Any]:
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
        
        # Calculate weighted risk score
        total_score = 0.0
        total_weight = 0.0
        
        for feature_name, score in feature_scores.items():
            weight = self.weights.get(feature_name, 0.0)
            total_score += score * weight
            total_weight += weight
        
        final_score = total_score / total_weight if total_weight > 0 else 0.0
        
        # Determine risk level
        risk_level = self._determine_risk_level(final_score)
        
        result = {
            "score": round(final_score, 3),
            "level": risk_level,
            "reasons": reasons,
            "feature_scores": feature_scores,
            "weights": self.weights,
            "thresholds": self.thresholds,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Save snapshot to database for historical tracking
        if save_snapshot and user_id != "demo":
            self._save_risk_snapshot(db, user_id, result)
        
        return result
    
    def _save_risk_snapshot(self, db: Session, user_id: str, risk_data: Dict[str, Any]):
        """Save risk snapshot to database for historical tracking"""
        try:
            snapshot = models.RiskSnapshot(
                user_id=user_id,
                score=risk_data["score"],
                level=risk_data["level"],
                feature_scores=risk_data["feature_scores"],
                reasons=risk_data["reasons"],
                weights=risk_data["weights"],
                thresholds=risk_data["thresholds"]
            )
            db.add(snapshot)
            db.commit()
        except Exception as e:
            print(f"Error saving risk snapshot: {e}")
            db.rollback()
    
    def get_risk_history(self, db: Session, user_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get historical risk data for sparkline trends"""
        if user_id == "demo":
            # Return demo data for sparkline
            base_time = datetime.utcnow()
            demo_data = []
            for i in range(7):
                demo_data.append({
                    "timestamp": (base_time - timedelta(days=6-i)).isoformat(),
                    "score": 0.2 + (i * 0.05) + (0.1 if i % 2 == 0 else 0),
                    "level": "low"
                })
            return demo_data
        
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            snapshots = db.query(models.RiskSnapshot).filter(
                and_(
                    models.RiskSnapshot.user_id == user_id,
                    models.RiskSnapshot.created_at >= cutoff_date
                )
            ).order_by(models.RiskSnapshot.created_at).all()
            
            return [{
                "timestamp": snapshot.created_at.isoformat(),
                "score": snapshot.score,
                "level": snapshot.level
            } for snapshot in snapshots]
        except Exception as e:
            print(f"Error getting risk history: {e}")
            return []
    
    def get_risk_changes(self, db: Session, user_id: str) -> Dict[str, Any]:
        """Get risk changes compared to previous assessment"""
        if user_id == "demo":
            return {
                "has_previous": True,
                "score_change": 0.05,
                "level_change": None,
                "new_reasons": ["Demo: Slight increase in demo data"],
                "resolved_reasons": [],
                "feature_changes": {
                    "mood_drop_7d": {"old": 0.2, "new": 0.25, "change": 0.05},
                    "safety_low": {"old": 0.3, "new": 0.3, "change": 0.0}
                }
            }
        
        try:
            # Get last two snapshots
            snapshots = db.query(models.RiskSnapshot).filter(
                models.RiskSnapshot.user_id == user_id
            ).order_by(desc(models.RiskSnapshot.created_at)).limit(2).all()
            
            if len(snapshots) < 2:
                return {"has_previous": False}
            
            current, previous = snapshots[0], snapshots[1]
            
            # Calculate changes
            score_change = current.score - previous.score
            level_change = current.level if current.level != previous.level else None
            
            # Find new and resolved reasons
            current_reasons = set(current.reasons)
            previous_reasons = set(previous.reasons)
            new_reasons = list(current_reasons - previous_reasons)
            resolved_reasons = list(previous_reasons - current_reasons)
            
            # Calculate feature changes
            feature_changes = {}
            for feature, current_score in current.feature_scores.items():
                previous_score = previous.feature_scores.get(feature, 0.0)
                change = current_score - previous_score
                if abs(change) > 0.01:  # Only show significant changes
                    feature_changes[feature] = {
                        "old": previous_score,
                        "new": current_score,
                        "change": change
                    }
            
            return {
                "has_previous": True,
                "score_change": round(score_change, 3),
                "level_change": level_change,
                "new_reasons": new_reasons,
                "resolved_reasons": resolved_reasons,
                "feature_changes": feature_changes,
                "previous_timestamp": previous.created_at.isoformat()
            }
        except Exception as e:
            print(f"Error getting risk changes: {e}")
            return {"has_previous": False}
    
    def _evaluate_feature(self, db: Session, user_id: str, feature_name: str, feature_rule: str) -> tuple[float, Optional[str]]:
        """Evaluate a single feature based on the rule"""
        try:
            if feature_name == "mood_drop_7d":
                return self._evaluate_mood_drop(db, user_id)
            elif feature_name == "safety_low":
                return self._evaluate_safety_low(db, user_id)
            elif feature_name == "negative_language":
                return self._evaluate_negative_language(db, user_id)
            elif feature_name == "missed_checkins":
                return self._evaluate_missed_checkins(db, user_id)
            elif feature_name == "game_telemetry_stress":
                return self._evaluate_game_stress(db, user_id)
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
    
    def _evaluate_safety_low(self, db: Session, user_id: str) -> tuple[float, Optional[str]]:
        """Evaluate if safety level is low"""
        # For MVP, we'll use a placeholder
        # In production, this would use actual safety check-in data
        return 0.3, "Safety level appears moderate (placeholder evaluation)"
    
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

@router.get("/risk/history")
def get_risk_history(days: int = 30, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Get historical risk data for sparkline trends"""
    print(f"DEBUG: Risk history requested for user_id: {user_id}, days: {days}")
    return {"history": risk_evaluator.get_risk_history(db, user_id, days)}

@router.get("/risk/changes")
def get_risk_changes(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Get risk changes compared to previous assessment"""
    print(f"DEBUG: Risk changes requested for user_id: {user_id}")
    return risk_evaluator.get_risk_changes(db, user_id)

@router.get("/risk/rules")
def get_risk_rules():
    """Get the current risk rules configuration"""
    return {
        "rules": risk_evaluator.rules,
        "weights": risk_evaluator.weights,
        "thresholds": risk_evaluator.thresholds,
        "features": risk_evaluator.features
    }
