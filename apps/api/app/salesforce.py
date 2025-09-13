"""Salesforce Data Cloud integration"""

import json
import requests
from typing import Dict, List, Any, Optional
from simple_salesforce import Salesforce
import time
import base64
import jwt  # PyJWT
from datetime import datetime
from .config import settings
from .utils.ids import user_id_hash

class DataCloudClient:
    def __init__(self):
        self.sf = None
        self.streaming_endpoint = None
        self.access_token = None
        self.instance_url = None
        
    def authenticate(self) -> bool:
        """Authenticate with Salesforce preferring JWT Bearer, fallback to username/password."""
        try:
            # Try JWT first if configured
            if settings.SALESFORCE_JWT_CLIENT_ID and settings.SALESFORCE_JWT_USERNAME and settings.SALESFORCE_JWT_PRIVATE_KEY_B64:
                if self._authenticate_jwt():
                    self.streaming_endpoint = f"{settings.DATA_CLOUD_ENDPOINT}/api/v1/streaming"
                    return True

            # Fallback to username/password if present
            if all([
                settings.SALESFORCE_INSTANCE_URL,
                settings.SALESFORCE_USERNAME,
                settings.SALESFORCE_PASSWORD,
                settings.SALESFORCE_SECURITY_TOKEN
            ]):
                self.sf = Salesforce(
                    instance_url=settings.SALESFORCE_INSTANCE_URL,
                    username=settings.SALESFORCE_USERNAME,
                    password=settings.SALESFORCE_PASSWORD,
                    security_token=settings.SALESFORCE_SECURITY_TOKEN
                )
                self.access_token = self.sf.session_id
                self.instance_url = settings.SALESFORCE_INSTANCE_URL
                self.streaming_endpoint = f"{settings.DATA_CLOUD_ENDPOINT}/api/v1/streaming"
                return True
            
            print("Missing Salesforce credentials for JWT and username/password")
            return False
            
        except Exception as e:
            print(f"Salesforce authentication failed: {e}")
            return False

    def _authenticate_jwt(self) -> bool:
        try:
            # Build and sign JWT assertion
            now = int(time.time())
            exp = now + 3 * 60  # 3 minutes
            payload = {
                "iss": settings.SALESFORCE_JWT_CLIENT_ID,
                "sub": settings.SALESFORCE_JWT_USERNAME,
                "aud": settings.SALESFORCE_JWT_AUDIENCE or "https://login.salesforce.com",
                "exp": exp,
            }
            private_key_pem = base64.b64decode(settings.SALESFORCE_JWT_PRIVATE_KEY_B64)
            assertion = jwt.encode(payload, private_key_pem, algorithm="RS256")

            token_url = (settings.SALESFORCE_JWT_AUDIENCE or "https://login.salesforce.com") + "/services/oauth2/token"
            resp = requests.post(token_url, data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": assertion,
            }, timeout=10)
            if resp.status_code != 200:
                print(f"JWT token error {resp.status_code}: {resp.text}")
                return False
            tok = resp.json()
            self.access_token = tok.get("access_token")
            self.instance_url = tok.get("instance_url") or settings.SALESFORCE_INSTANCE_URL
            self.sf = Salesforce(instance_url=self.instance_url, session_id=self.access_token)
            return True
        except Exception as e:
            print(f"JWT auth exception: {e}")
            return False
    
    def stream_chat_event(self, event_data: Dict[str, Any]) -> bool:
        """Stream a single chat event to Data Cloud"""
        try:
            if not self.sf or not settings.DATA_CLOUD_STREAMING_ENABLED:
                return False
                
            # Transform event to Data Cloud format
            payload = self._transform_chat_event(event_data)
            
            # Send to streaming API
            headers = {
                'Authorization': f'Bearer {self.access_token or (self.sf.session_id if self.sf else "")}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                f"{self.streaming_endpoint}/chat_events",
                headers=headers,
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"Successfully streamed event {payload.get('event_id')}")
                return True
            else:
                print(f"Streaming failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"Error streaming chat event: {e}")
            return False
    
    def stream_risk_snapshot(self, user_id: str, risk_data: Dict[str, Any]) -> bool:
        """Stream a risk snapshot to Data Cloud"""
        try:
            if not self.sf or not settings.DATA_CLOUD_STREAMING_ENABLED:
                return False
                
            payload = {
                "user_id_hash": user_id_hash(user_id),
                "created_at": datetime.utcnow().isoformat(),
                "score": risk_data.get("score", 0.0),
                "level": risk_data.get("level", "unknown"),
                "top_reasons": ",".join(risk_data.get("reasons", [])),
                "feature_scores": json.dumps(risk_data.get("feature_scores", {}))
            }
            
            headers = {
                'Authorization': f'Bearer {self.access_token or (self.sf.session_id if self.sf else "")}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                f"{self.streaming_endpoint}/risk_snapshots",
                headers=headers,
                json=payload,
                timeout=10
            )
            
            return response.status_code == 200
            
        except Exception as e:
            print(f"Error streaming risk snapshot: {e}")
            return False
    
    def _transform_chat_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform internal event to Data Cloud schema format"""
        # Extract extra_json fields if present
        extra = {}
        if event_data.get("extra_json"):
            try:
                extra = json.loads(event_data["extra_json"])
            except:
                pass
        
        return {
            "event_id": event_data.get("event_id"),
            "user_id_hash": user_id_hash(event_data.get("user_id", "")),
            "chat_id": event_data.get("chat_id"),
            "created_at": event_data.get("created_at", datetime.utcnow().isoformat()),
            "journal_entry": event_data.get("journal_entry"),
            "entry_source": event_data.get("entry_source", "web"),
            "jurisdiction": event_data.get("jurisdiction"),
            "location_type": event_data.get("location_type"),
            "children_present": event_data.get("children_present"),
            "event_type": event_data.get("event_type"),
            "type_of_abuse": event_data.get("type_of_abuse"),
            "sentiment_score": event_data.get("sentiment_score"),
            "risk_points": event_data.get("risk_points"),
            "severity_score": event_data.get("severity_score"),
            "escalation_index": event_data.get("escalation_index"),
            "threats_to_kill": event_data.get("threats_to_kill"),
            "strangulation": event_data.get("strangulation"),
            "weapon_involved": event_data.get("weapon_involved"),
            "stalking": event_data.get("stalking"),
            "digital_surveillance": event_data.get("digital_surveillance"),
            "model_summary": event_data.get("model_summary"),
            "confidentiality_level": event_data.get("confidentiality_level"),
            "share_with": event_data.get("share_with"),
            # Fields from extra_json
            "substance_use": extra.get("substance_use"),
            "victim_housing": extra.get("victim_housing"),
            "support": extra.get("support"),
            "financial_control": extra.get("financial_control"),
            "reporting_history": extra.get("reporting_history"),
            "frequency_of_abuse": extra.get("frequency_of_abuse"),
            "recent_escalation": extra.get("recent_escalation"),
            "safety_plan_state": extra.get("safety_plan_state"),
            "safety_plan_last_updated": extra.get("safety_plan_last_updated")
        }

# Global client instance
data_cloud_client = DataCloudClient()
