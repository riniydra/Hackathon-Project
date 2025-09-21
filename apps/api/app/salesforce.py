"""Salesforce Data Cloud integration"""

import json
import requests
from typing import Dict, Any
from simple_salesforce import Salesforce
import time
import base64
import jwt  # PyJWT
from datetime import datetime, timezone
from .config import settings
from .utils.ids import user_id_hash

class DataCloudClient:
    def __init__(self):
        self.sf = None
        self.streaming_endpoint = None
        self.ingest_source_base = None
        self.access_token = None
        self.instance_url = None
        
    def authenticate(self) -> bool:
        """Authenticate with Salesforce preferring JWT Bearer, fallback to username/password."""
        try:
            # Try JWT first if configured
            if settings.SALESFORCE_JWT_CLIENT_ID and settings.SALESFORCE_JWT_USERNAME and settings.SALESFORCE_JWT_PRIVATE_KEY_B64:
                if self._authenticate_jwt():
                    self._init_endpoints()
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
                self._init_endpoints()
                return True
            
            print("Missing Salesforce credentials for JWT and username/password")
            return False
            
        except Exception as e:
            print(f"Salesforce authentication failed: {e}")
            return False

    def _init_endpoints(self) -> None:
        # Detect ingest vs streaming based on DATA_CLOUD_ENDPOINT
        base = (settings.DATA_CLOUD_ENDPOINT or '').rstrip('/')
        if "/ingest/sources/" in base:
            self.ingest_source_base = base  # e.g., https://.../api/v1/ingest/sources/App_Data_Connector
            self.streaming_endpoint = None
        else:
            self.streaming_endpoint = f"{base}/api/v1/streaming" if base else None
            self.ingest_source_base = None

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

    def _auth_headers(self) -> Dict[str, str]:
        return {
            'Authorization': f'Bearer {self.access_token or (self.sf.session_id if self.sf else "")}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }

    def _iso_now(self) -> str:
        # Always Z-suffixed UTC
        return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    def _ensure_iso8601_z(self, value: Any) -> str:
        if value is None:
            return self._iso_now()
        if isinstance(value, datetime):
            return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        if isinstance(value, str):
            if 'Z' in value or '+' in value:
                # Normalize +00:00 to Z
                return value.replace("+00:00", "Z")
            return value + 'Z'
        # Fallback
        return self._iso_now()

    def _coerce_types_chat_event(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        # Coerce to schema types
        bool_fields = {
            "children_present","threats_to_kill","strangulation","weapon_involved",
            "stalking","digital_surveillance"
        }
        num_fields = {"sentiment_score","risk_points","severity_score","escalation_index"}
        for k in list(payload.keys()):
            v = payload[k]
            if v is None:
                continue
            if k in bool_fields:
                payload[k] = bool(v)
            elif k in num_fields:
                try:
                    payload[k] = float(v)
                except Exception:
                    del payload[k]
        # Ensure created_at format
        payload['created_at'] = self._ensure_iso8601_z(payload.get('created_at'))
        return payload

    def _clean(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        # Drop None values and truncate long strings
        cleaned: Dict[str, Any] = {}
        for k, v in payload.items():
            if v is None:
                continue
            if isinstance(v, str) and k in ("journal_entry", "model_summary"):
                cleaned[k] = v[:4000]
            else:
                cleaned[k] = v
        # Ensure created_at is ISO8601 Z
        cleaned['created_at'] = self._ensure_iso8601_z(cleaned.get('created_at'))
        return cleaned
    
    def stream_chat_event(self, event_data: Dict[str, Any]) -> bool:
        """Stream a single chat event to Data Cloud"""
        try:
            if not settings.DATA_CLOUD_STREAMING_ENABLED:
                return False
            # Lazy auth if not yet authenticated
            if not self.sf and not self.authenticate():
                return False
            
            full_payload = self._transform_chat_event(event_data)
            if settings.DATA_CLOUD_MINIMAL_PAYLOAD:
                # Minimal required fields only, to isolate schema issues
                minimal = {
                    "event_id": full_payload.get("event_id"),
                    "user_id_hash": full_payload.get("user_id_hash"),
                    "created_at": full_payload.get("created_at"),
                    "journal_entry": full_payload.get("journal_entry"),
                    "entry_source": full_payload.get("entry_source", "web"),
                }
                payload = self._clean(self._coerce_types_chat_event(minimal))
            else:
                payload = self._clean(self._coerce_types_chat_event(full_payload))
            headers = self._auth_headers()
            
            # URL selection: explicit override > ingest source base > streaming
            if settings.DATA_CLOUD_CHAT_EVENTS_URL:
                url = settings.DATA_CLOUD_CHAT_EVENTS_URL
            elif self.ingest_source_base:
                url = f"{self.ingest_source_base}/chat_events"
            else:
                url = f"{self.streaming_endpoint}/chat_events"
            body = {"data": [payload]} if "/ingest/" in url else payload
            response = requests.post(url, headers=headers, json=body, timeout=15)

            # Retry once on expired/unauthorized
            if response.status_code in (401, 403):
                if self.authenticate():
                    headers = self._auth_headers()
                    response = requests.post(url, headers=headers, json=body, timeout=15)
            
            if 200 <= response.status_code < 300:
                print(f"Successfully streamed event {payload.get('event_id')} (status {response.status_code})")
                return True
            else:
                body_preview = str(body)
                if len(body_preview) > 500:
                    body_preview = body_preview[:500] + "..."
                hdrs = {k: v for k, v in response.headers.items()}
                print(
                    f"Streaming failed: {response.status_code} - {response.text} | "
                    f"url={url} | body_keys={list(payload.keys())} | headers={hdrs} | body={body_preview}"
                )
                return False
        except Exception as e:
            print(f"Error streaming chat event: {e}")
            return False
    
    def stream_risk_snapshot(self, user_id: str, risk_data: Dict[str, Any]) -> bool:
        """Stream a risk snapshot to Data Cloud"""
        try:
            if not settings.DATA_CLOUD_STREAMING_ENABLED:
                return False
            if not self.sf and not self.authenticate():
                return False
            
            payload = self._clean({
                "user_id_hash": user_id_hash(user_id),
                "created_at": self._iso_now(),
                "score": risk_data.get("score", 0.0),
                "level": risk_data.get("level", "unknown"),
                "top_reasons": ",".join(risk_data.get("reasons", [])),
                "feature_scores": json.dumps(risk_data.get("feature_scores", {}))
            })
            headers = self._auth_headers()
            
            if settings.DATA_CLOUD_RISK_SNAPSHOTS_URL:
                url = settings.DATA_CLOUD_RISK_SNAPSHOTS_URL
            elif self.ingest_source_base:
                url = f"{self.ingest_source_base}/risk_snapshots"
            else:
                url = f"{self.streaming_endpoint}/risk_snapshots"
            body = {"data": [payload]} if "/ingest/" in url else payload
            response = requests.post(url, headers=headers, json=body, timeout=15)

            if response.status_code in (401, 403):
                if self.authenticate():
                    headers = self._auth_headers()
                    response = requests.post(url, headers=headers, json=body, timeout=15)
            
            if 200 <= response.status_code < 300:
                print(f"Successfully streamed risk snapshot (status {response.status_code})")
                return True
            else:
                body_preview = str(body)
                if len(body_preview) > 500:
                    body_preview = body_preview[:500] + "..."
                hdrs = {k: v for k, v in response.headers.items()}
                print(
                    f"Error streaming risk snapshot: {response.status_code} - {response.text} | "
                    f"url={url} | body_keys={list(payload.keys())} | headers={hdrs} | body={body_preview}"
                )
                return False
        except Exception as e:
            print(f"Error streaming risk snapshot: {e}")
            return False
    
    def _transform_chat_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform internal event to Data Cloud schema format"""
        extra = {}
        if event_data.get("extra_json"):
            try:
                extra = json.loads(event_data["extra_json"])
            except:
                pass
        # Build according to schema
        out = {
            "event_id": event_data.get("event_id"),
            "user_id_hash": user_id_hash(event_data.get("user_id", "")),
            "chat_id": event_data.get("chat_id"),
            "created_at": event_data.get("created_at"),
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
            # From extra_json
            "substance_use": extra.get("substance_use"),
            "victim_housing": extra.get("victim_housing"),
            "support": extra.get("support"),
            "financial_control": extra.get("financial_control"),
            "reporting_history": extra.get("reporting_history"),
            "frequency_of_abuse": extra.get("frequency_of_abuse"),
            "recent_escalation": extra.get("recent_escalation"),
            "safety_plan_state": extra.get("safety_plan_state"),
            "safety_plan_last_updated": extra.get("safety_plan_last_updated"),
        }
        return out

# Global client instance
data_cloud_client = DataCloudClient()
