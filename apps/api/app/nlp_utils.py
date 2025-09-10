# NLP utilities ported from chatdemoapp.py for DV support analysis

from typing import Dict, List, Tuple
import json

# Risk point weights for DV-specific indicators
RISK_POINTS = {
    "threats_to_kill": 5,
    "strangulation": 7, 
    "weapon_involved": 5,
    "children_present": 2,
    "stalking": 3,
    "digital_surveillance": 2
}

def classify_intent(text: str) -> str:
    """Classify user intent from message text"""
    t = text.lower()
    if any(k in t for k in ["lawyer", "restraining order", "file a case", "court"]):
        return "seek_legal_info"
    if any(k in t for k in ["safety plan", "safe place", "shelter"]):
        return "safety_planning"
    if any(k in t for k in ["help", "support", "feel", "anxious", "scared", "afraid"]):
        return "seek_emotional_support"
    return "report_incident"

def classify_abuse(text: str) -> str:
    """Classify type of abuse mentioned in text"""
    labels, t = [], text.lower()
    if any(k in t for k in ["hit", "slap", "choke", "punch", "strangle"]):
        labels.append("physical")
    if any(k in t for k in ["insult", "gaslight", "control", "isolate"]):
        labels.append("emotional")
    if any(k in t for k in ["took my money", "paycheck", "bank", "card"]):
        labels.append("financial")
    if any(k in t for k in ["tracker", "spy app", "keylogger", "icloud", "gps"]):
        labels.append("digital_surveillance")
    if any(k in t for k in ["followed me", "waiting outside", "shows up", "tailing"]):
        labels.append("stalking")
    if any(k in t for k in ["forced", "sexual", "assault", "rape"]):
        labels.append("sexual")
    return ",".join(sorted(set(labels))) or "unknown"

def extract_risk_flags(text: str) -> Dict[str, bool]:
    """Extract DV-specific risk flags from text"""
    t = text.lower()
    return {
        "threats_to_kill": any(k in t for k in ["kill you", "end your life", "die"]),
        "strangulation": any(k in t for k in ["strangle", "choke"]),
        "weapon_involved": any(k in t for k in ["gun", "knife", "weapon"]),
        "children_present": any(k in t for k in ["our kid", "my son", "my daughter", "children", "baby"]),
        "stalking": any(k in t for k in ["followed", "waiting outside", "stalk", "tailing"]),
        "digital_surveillance": any(k in t for k in ["tracker", "spy", "keylogger", "icloud", "gps", "find my"]),
    }

def simple_sentiment(text: str) -> float:
    """Simple sentiment analysis for DV context"""
    neg = any(k in text.lower() for k in [
        "scared", "afraid", "anxious", "cry", "hurt", "threat", "panic", "unsafe", "fear"
    ])
    pos = any(k in text.lower() for k in [
        "relief", "safe now", "thank you", "helpful", "calm"
    ])
    if neg and not pos:
        return -0.6
    if pos and not neg:
        return 0.4
    return -0.1 if neg else 0.1

def calculate_risk_scores(flags: Dict[str, bool]) -> Dict[str, float]:
    """Calculate risk scores based on extracted flags"""
    pts = sum(v for k, v in RISK_POINTS.items() if flags.get(k, False))
    return {
        "risk_points": pts,
        "severity_score": min(100, pts * 10),
        "escalation_index": min(1.0, pts / 10.0)
    }

def analyze_message(text: str) -> Dict:
    """Complete NLP analysis of a message"""
    intent = classify_intent(text)
    abuse_type = classify_abuse(text)
    flags = extract_risk_flags(text)
    sentiment = simple_sentiment(text)
    risk_scores = calculate_risk_scores(flags)
    
    return {
        "intent": intent,
        "abuse_type": abuse_type,
        "sentiment_score": sentiment,
        "risk_flags": flags,
        "risk_points": risk_scores["risk_points"],
        "severity_score": risk_scores["severity_score"],
        "escalation_index": risk_scores["escalation_index"]
    }

def is_high_risk(flags: Dict[str, bool]) -> bool:
    """Check if message contains high-risk indicators"""
    high_risk_flags = ["threats_to_kill", "strangulation", "weapon_involved"]
    return any(flags.get(flag, False) for flag in high_risk_flags)

def get_emergency_message() -> str:
    """Get emergency resources message"""
    return (
        "⚠️ High-risk indicators detected. If you're in danger, call 911 (U.S.) or local emergency services. "
        "For confidential help (U.S.), National DV Hotline: 1-800-799-SAFE or text START to 88788."
    )
