import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from supabase import create_client, Client
from config import settings

logger = logging.getLogger("wagora-api")

_supabase_client = None
LOCAL_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "local_db.json")

def get_supabase_client() -> Client:
    """
    Returns the singleton administrative Supabase client instance.
    Raises ValueError if settings are unconfigured.
    """
    global _supabase_client
    if _supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables")
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _supabase_client

def get_user_supabase_client(user_token: Optional[str] = None) -> Client:
    """
    Returns a user-scoped Supabase client for RLS-protected queries.
    Uses anon key and attaches postgrest.auth(user_token) for user context.
    """
    if not settings.SUPABASE_URL:
        raise ValueError("SUPABASE_URL must be set in environment variables")
    anon_key = os.getenv("SUPABASE_ANON_KEY", "") or settings.SUPABASE_SERVICE_ROLE_KEY
    client = create_client(settings.SUPABASE_URL, anon_key)
    if user_token:
        client.postgrest.auth(user_token)
    return client


# =========================================================================
# LOCAL FALLBACK DATABASE IMPLEMENTATION
# =========================================================================

def _init_local_db():
    if not os.path.exists(LOCAL_DB_PATH):
        with open(LOCAL_DB_PATH, "w", encoding="utf-8") as f:
            json.dump({
                "profiles": {},
                "workspace_settings": {},
                "campaigns": {},
                "brand_documents": {},
                "sales_agents": {},
                "conversations": {},
                "messages": {},
                "prospects": {},
                "activities": {},
                "notifications": {},
                "followup_queue": {}
            }, f, indent=2)

def _read_local_db() -> Dict[str, Any]:
    _init_local_db()
    try:
        with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"profiles": {}, "workspace_settings": {}, "campaigns": {}, "brand_documents": {}}

def _write_local_db(data: Dict[str, Any]):
    try:
        with open(LOCAL_DB_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to write to local DB: {e}")

# =========================================================================
# WRAPPED DATABASE ACTIONS WITH AUTOFALLBACK
# =========================================================================

async def db_get_profile(user_id: str) -> Dict[str, Any]:
    try:
        supabase = get_supabase_client()
        res = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.warning(f"Supabase profiles query failed, falling back: {e}")
    
    db = _read_local_db()
    return db["profiles"].get(user_id, {"id": user_id, "business_name": "Wagora User", "industry": "B2B"})

async def db_get_workspace_settings(user_id: str) -> Dict[str, Any]:
    try:
        supabase = get_supabase_client()
        res = supabase.table("workspace_settings").select("*").eq("user_id", user_id).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.warning(f"Supabase workspace_settings query failed, falling back: {e}")
    
    db = _read_local_db()
    return db["workspace_settings"].get(user_id, {
        "user_id": user_id,
        "what_you_sell": "Custom software development",
        "target_client_description": "Tech startups and medium enterprises looking for software services."
    })

async def db_update_workspace_settings(user_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        supabase = get_supabase_client()
        res = supabase.table("workspace_settings").update(update_data).eq("user_id", user_id).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.warning(f"Supabase workspace_settings update failed, falling back: {e}")
    
    db = _read_local_db()
    current = db["workspace_settings"].get(user_id, {"user_id": user_id})
    current.update(update_data)
    db["workspace_settings"][user_id] = current
    _write_local_db(db)
    return current

async def db_get_brand_documents(user_id: str, campaign_id: str = None) -> List[Dict[str, Any]]:
    try:
        supabase = get_supabase_client()
        query = supabase.table("brand_documents").select("*").eq("user_id", user_id)
        if campaign_id:
            query = query.eq("campaign_id", campaign_id)
        res = query.execute()
        if res.data:
            return res.data
    except Exception as e:
        logger.warning(f"Supabase brand_documents query failed, falling back: {e}")
    
    db = _read_local_db()
    results = []
    for doc_id, doc in db.get("brand_documents", {}).items():
        if doc.get("user_id") == user_id:
            if campaign_id is None or doc.get("campaign_id") == campaign_id:
                results.append(doc)
    return results

async def db_get_brand_document(doc_id: str) -> Optional[Dict[str, Any]]:
    try:
        supabase = get_supabase_client()
        res = supabase.table("brand_documents").select("*").eq("id", doc_id).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.warning(f"Supabase brand_documents single query failed, falling back: {e}")
    
    db = _read_local_db()
    return db.get("brand_documents", {}).get(doc_id)

async def db_insert_brand_document(doc_data: Dict[str, Any]) -> Dict[str, Any]:
    doc_id = doc_data.get("id")
    if not doc_id:
        import uuid
        doc_id = str(uuid.uuid4())
        doc_data["id"] = doc_id
    
    # Ensure uploaded_at exists
    if "uploaded_at" not in doc_data:
        doc_data["uploaded_at"] = datetime.utcnow().isoformat()

    try:
        supabase = get_supabase_client()
        # Clean data of custom properties that might break DB if columns don't exist
        cleaned_data = {
            "id": doc_data["id"],
            "user_id": doc_data["user_id"],
            "name": doc_data["name"],
            "file_type": doc_data["file_type"],
            "size": doc_data["size"],
            "storage_path": doc_data["storage_path"],
            "status": doc_data.get("status", "Processing")
        }
        res = supabase.table("brand_documents").insert(cleaned_data).execute()
        logger.info(f"Inserted brand document to Supabase: {res.data}")
    except Exception as e:
        logger.warning(f"Supabase brand_documents insert failed, falling back: {e}")
    
    db = _read_local_db()
    if "brand_documents" not in db:
        db["brand_documents"] = {}
    db["brand_documents"][doc_id] = doc_data
    _write_local_db(db)
    return doc_data

async def db_update_brand_document(doc_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        supabase = get_supabase_client()
        # Clean of fields that might not exist in database if schemas aren't migrated
        cleaned_data = {}
        for k in ["name", "file_type", "size", "storage_path", "status"]:
            if k in update_data:
                cleaned_data[k] = update_data[k]
        if cleaned_data:
            supabase.table("brand_documents").update(cleaned_data).eq("id", doc_id).execute()
    except Exception as e:
        logger.warning(f"Supabase brand_documents update failed, falling back: {e}")
    
    db = _read_local_db()
    if "brand_documents" not in db:
        db["brand_documents"] = {}
    current = db["brand_documents"].get(doc_id, {"id": doc_id})
    current.update(update_data)
    db["brand_documents"][doc_id] = current
    _write_local_db(db)
    return current

async def db_get_campaign(campaign_id: str) -> Optional[Dict[str, Any]]:
    try:
        supabase = get_supabase_client()
        res = supabase.table("campaigns").select("*").eq("id", campaign_id).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.warning(f"Supabase campaigns query failed, falling back: {e}")
    
    db = _read_local_db()
    return db["campaigns"].get(campaign_id)

async def db_update_campaign(campaign_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        supabase = get_supabase_client()
        cleaned_data = {}
        for k in ["name", "platform", "description", "status", "prospects", "replies", "closed", "last_active"]:
            if k in update_data:
                cleaned_data[k] = update_data[k]
        if cleaned_data:
            supabase.table("campaigns").update(cleaned_data).eq("id", campaign_id).execute()
    except Exception as e:
        logger.warning(f"Supabase campaigns update failed, falling back: {e}")
    
    db = _read_local_db()
    current = db["campaigns"].get(campaign_id, {"id": campaign_id})
    current.update(update_data)
    db["campaigns"][campaign_id] = current
    _write_local_db(db)
    return current


async def db_get_prospects(user_id: str, campaign_id: str = None) -> List[Dict[str, Any]]:
    try:
        supabase = get_supabase_client()
        query = supabase.table("prospects").select("*").eq("user_id", user_id)
        if campaign_id:
            query = query.eq("campaign_id", campaign_id)
        res = query.order("created_at", desc=True).execute()
        if res.data:
            return res.data
    except Exception as e:
        logger.warning(f"Supabase prospects query failed, falling back: {e}")
    
    db = _read_local_db()
    results = []
    prospects_dict = db.get("prospects", {})
    for p_id, p in prospects_dict.items():
        if p.get("user_id") == user_id:
            if campaign_id is None or p.get("campaign_id") == campaign_id:
                results.append(p)
    results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return results


async def db_get_prospect(prospect_id: str) -> Optional[Dict[str, Any]]:
    try:
        supabase = get_supabase_client()
        res = supabase.table("prospects").select("*").eq("id", prospect_id).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.warning(f"Supabase prospect single query failed, falling back: {e}")
    
    db = _read_local_db()
    return db.get("prospects", {}).get(prospect_id)


async def db_insert_prospect(prospect_data: Dict[str, Any]) -> Dict[str, Any]:
    prospect_id = prospect_data.get("id")
    if not prospect_id:
        import uuid
        prospect_id = str(uuid.uuid4())
        prospect_data["id"] = prospect_id
        
    if "created_at" not in prospect_data:
        prospect_data["created_at"] = datetime.utcnow().isoformat()
        
    try:
        supabase = get_supabase_client()
        supabase.table("prospects").insert(prospect_data).execute()
        logger.info(f"Prospect saved to Supabase: {prospect_id}")
    except Exception as e:
        logger.warning(f"Supabase prospects insert failed, falling back: {e}")
        
    db = _read_local_db()
    if "prospects" not in db:
        db["prospects"] = {}
    db["prospects"][prospect_id] = prospect_data
    _write_local_db(db)
    return prospect_data


async def db_update_prospect(prospect_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        supabase = get_supabase_client()
        # Clean for remote DB schema
        cleaned_data = {}
        for k in ["name", "company", "role", "email", "score", "platform", "status", "last_contact"]:
            if k in update_data:
                cleaned_data[k] = update_data[k]
        if cleaned_data:
            supabase.table("prospects").update(cleaned_data).eq("id", prospect_id).execute()
            logger.info(f"Prospect updated in Supabase: {prospect_id}")
    except Exception as e:
        logger.warning(f"Supabase prospects update failed, falling back: {e}")
        
    db = _read_local_db()
    if "prospects" not in db:
        db["prospects"] = {}
    current = db["prospects"].get(prospect_id, {"id": prospect_id})
    current.update(update_data)
    db["prospects"][prospect_id] = current
    _write_local_db(db)
    return current


async def db_delete_prospect(prospect_id: str) -> bool:
    try:
        supabase = get_supabase_client()
        supabase.table("prospects").delete().eq("id", prospect_id).execute()
    except Exception as e:
        logger.warning(f"Supabase prospects delete failed: {e}")
        
    db = _read_local_db()
    if "prospects" in db and prospect_id in db["prospects"]:
        del db["prospects"][prospect_id]
        _write_local_db(db)
        return True
    return False


async def db_get_daily_usage(user_id: str, date_str: str) -> int:
    try:
        supabase = get_supabase_client()
        res = supabase.table("daily_usage").select("email_count").eq("user_id", user_id).eq("date", date_str).execute()
        if res.data:
            return res.data[0].get("email_count", 0)
    except Exception as e:
        logger.warning(f"Supabase daily_usage fetch failed, falling back: {e}")
    
    db = _read_local_db()
    usage = db.get("daily_usage", {})
    key = f"{user_id}_{date_str}"
    return usage.get(key, {}).get("email_count", 0)


async def db_increment_daily_usage(user_id: str, date_str: str) -> int:
    try:
        supabase = get_supabase_client()
        res = supabase.table("daily_usage").select("*").eq("user_id", user_id).eq("date", date_str).execute()
        if res.data:
            current = res.data[0].get("email_count", 0)
            new_count = current + 1
            supabase.table("daily_usage").update({"email_count": new_count}).eq("user_id", user_id).eq("date", date_str).execute()
            logger.info(f"Supabase daily_usage incremented to {new_count}")
        else:
            supabase.table("daily_usage").insert({"user_id": user_id, "date": date_str, "email_count": 1}).execute()
            logger.info(f"Supabase daily_usage initialized at 1")
    except Exception as e:
        logger.warning(f"Supabase daily_usage increment failed, falling back: {e}")
        
    db = _read_local_db()
    if "daily_usage" not in db:
        db["daily_usage"] = {}
    key = f"{user_id}_{date_str}"
    record = db["daily_usage"].get(key, {"user_id": user_id, "date": date_str, "email_count": 0})
    record["email_count"] += 1
    db["daily_usage"][key] = record
    _write_local_db(db)
    return record["email_count"]


async def db_insert_message(msg_data: Dict[str, Any]) -> Dict[str, Any]:
    msg_id = msg_data.get("id")
    if not msg_id:
        import uuid
        msg_id = str(uuid.uuid4())
        msg_data["id"] = msg_id
        
    if "created_at" not in msg_data:
        msg_data["created_at"] = datetime.utcnow().isoformat()
        
    try:
        supabase = get_supabase_client()
        # Clean for remote DB schema
        cleaned_data = {}
        for k in ["id", "conversation_id", "sender", "content", "timestamp"]:
            if k in msg_data:
                cleaned_data[k] = msg_data[k]
        if cleaned_data:
            supabase.table("messages").insert(cleaned_data).execute()
    except Exception as e:
        logger.warning(f"Supabase messages insert failed, falling back: {e}")
        
    db = _read_local_db()
    if "messages" not in db:
        db["messages"] = {}
    db["messages"][msg_id] = msg_data
    _write_local_db(db)
    return msg_data


async def db_check_email_contacted(user_id: str, email: str) -> bool:
    if not email:
        return False
    try:
        supabase = get_supabase_client()
        res = supabase.table("messages").select("id").eq("user_id", user_id).eq("prospect_email", email).execute()
        if res.data:
            return True
    except Exception as e:
        logger.warning(f"Supabase messages duplicate check failed, falling back: {e}")
        
    db = _read_local_db()
    messages_dict = db.get("messages", {})
    for msg in messages_dict.values():
        if msg.get("user_id") == user_id:
            if msg.get("prospect_email") == email or msg.get("email") == email or msg.get("to_email") == email:
                return True
    return False


async def db_insert_activity(activity_data: Dict[str, Any]) -> Dict[str, Any]:
    act_id = activity_data.get("id")
    if not act_id:
        import uuid
        act_id = str(uuid.uuid4())
        activity_data["id"] = act_id
        
    if "created_at" not in activity_data:
        activity_data["created_at"] = datetime.utcnow().isoformat()
        
    try:
        supabase = get_supabase_client()
        supabase.table("activities").insert(activity_data).execute()
    except Exception as e:
        logger.warning(f"Supabase activities insert failed, falling back: {e}")
        
    db = _read_local_db()
    if "activities" not in db:
        db["activities"] = {}
    db["activities"][act_id] = activity_data
    _write_local_db(db)
    return activity_data


async def db_insert_notification(notif_data: Dict[str, Any]) -> Dict[str, Any]:
    notif_id = notif_data.get("id")
    if not notif_id:
        import uuid
        notif_id = str(uuid.uuid4())
        notif_data["id"] = notif_id
        
    if "created_at" not in notif_data:
        notif_data["created_at"] = datetime.utcnow().isoformat()
        
    try:
        supabase = get_supabase_client()
        supabase.table("notifications").insert(notif_data).execute()
    except Exception as e:
        logger.warning(f"Supabase notifications insert failed, falling back: {e}")
        
    db = _read_local_db()
    if "notifications" not in db:
        db["notifications"] = {}
    db["notifications"][notif_id] = notif_data
    _write_local_db(db)
    return notif_data


async def db_get_active_agent(user_id: str) -> Optional[Dict[str, Any]]:
    try:
        supabase = get_supabase_client()
        profile_res = supabase.table("profiles").select("active_agent_id").eq("id", user_id).execute()
        if profile_res.data and profile_res.data[0].get("active_agent_id"):
            agent_id = profile_res.data[0]["active_agent_id"]
            agent_res = supabase.table("sales_agents").select("*").eq("id", agent_id).execute()
            if agent_res.data:
                return agent_res.data[0]
        agent_res = supabase.table("sales_agents").select("*").eq("user_id", user_id).eq("is_active", True).limit(1).execute()
        if agent_res.data:
            return agent_res.data[0]
    except Exception as e:
        logger.warning(f"Supabase active agent query failed, falling back: {e}")
        
    db = _read_local_db()
    profile = db.get("profiles", {}).get(user_id, {})
    active_agent_id = profile.get("active_agent_id")
    if active_agent_id and active_agent_id in db.get("sales_agents", {}):
        return db["sales_agents"][active_agent_id]
        
    sales_agents_dict = db.get("sales_agents", {})
    for agent in sales_agents_dict.values():
        if agent.get("user_id") == user_id and agent.get("is_active"):
            return agent
    return None


async def db_save_agent(user_id: str, agent_data: Dict[str, Any]) -> Dict[str, Any]:
    agent_id = agent_data.get("id")
    if not agent_id:
        import uuid
        agent_id = str(uuid.uuid4())
        agent_data["id"] = agent_id
        
    agent_data["user_id"] = user_id
    if "created_at" not in agent_data:
        agent_data["created_at"] = datetime.utcnow().isoformat()
        
    try:
        supabase = get_supabase_client()
        supabase.table("sales_agents").upsert(agent_data).execute()
        supabase.table("profiles").update({"active_agent_id": agent_id}).eq("id", user_id).execute()
        logger.info(f"Agent saved to Supabase: {agent_id}")
    except Exception as e:
        logger.warning(f"Supabase agent save failed, falling back: {e}")
        
    db = _read_local_db()
    if "sales_agents" not in db:
        db["sales_agents"] = {}
    db["sales_agents"][agent_id] = agent_data
    
    if "profiles" not in db:
        db["profiles"] = {}
    profile = db["profiles"].get(user_id, {"id": user_id})
    profile["active_agent_id"] = agent_id
    db["profiles"][user_id] = profile
    
    _write_local_db(db)
    return agent_data


async def db_get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    try:
        supabase = get_supabase_client()
        res = supabase.table("conversations").select("*").eq("id", conversation_id).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.warning(f"Supabase conversation fetch failed, falling back: {e}")
        
    db = _read_local_db()
    return db.get("conversations", {}).get(conversation_id)


async def db_get_conversations(user_id: str) -> List[Dict[str, Any]]:
    try:
        supabase = get_supabase_client()
        res = supabase.table("conversations").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        if res.data:
            return res.data
    except Exception as e:
        logger.warning(f"Supabase conversations fetch failed, falling back: {e}")
        
    db = _read_local_db()
    results = []
    conversations_dict = db.get("conversations", {})
    for c in conversations_dict.values():
        if c.get("user_id") == user_id:
            results.append(c)
    results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return results


async def db_get_conversation_messages(conversation_id: str) -> List[Dict[str, Any]]:
    try:
        supabase = get_supabase_client()
        res = supabase.table("messages").select("*").eq("conversation_id", conversation_id).order("timestamp", desc=False).execute()
        if res.data:
            return res.data
    except Exception as e:
        logger.warning(f"Supabase conversation messages fetch failed, falling back: {e}")
        
    db = _read_local_db()
    results = []
    messages_dict = db.get("messages", {})
    for m in messages_dict.values():
        if m.get("conversation_id") == conversation_id:
            results.append(m)
    results.sort(key=lambda x: x.get("timestamp", ""))
    return results


async def db_update_conversation(conversation_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        supabase = get_supabase_client()
        supabase.table("conversations").update(update_data).eq("id", conversation_id).execute()
        logger.info(f"Conversation updated in Supabase: {conversation_id}")
    except Exception as e:
        logger.warning(f"Supabase conversation update failed, falling back: {e}")
        
    db = _read_local_db()
    if "conversations" not in db:
        db["conversations"] = {}
    current = db["conversations"].get(conversation_id, {"id": conversation_id})
    current.update(update_data)
    db["conversations"][conversation_id] = current
    _write_local_db(db)
    return current


async def db_get_message(message_id: str) -> Optional[Dict[str, Any]]:
    try:
        supabase = get_supabase_client()
        res = supabase.table("messages").select("*").eq("id", message_id).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.warning(f"Supabase message fetch failed, falling back: {e}")
        
    db = _read_local_db()
    return db.get("messages", {}).get(message_id)


async def db_insert_followup(followup_data: Dict[str, Any]) -> Dict[str, Any]:
    followup_id = followup_data.get("id")
    if not followup_id:
        import uuid
        followup_id = str(uuid.uuid4())
        followup_data["id"] = followup_id
        
    try:
        supabase = get_supabase_client()
        supabase.table("followup_queue").insert(followup_data).execute()
        logger.info(f"Followup scheduled in Supabase: {followup_id}")
    except Exception as e:
        logger.warning(f"Supabase followup insert failed, falling back: {e}")
        
    db = _read_local_db()
    if "followup_queue" not in db:
        db["followup_queue"] = {}
    db["followup_queue"][followup_id] = followup_data
    _write_local_db(db)
    return followup_data
