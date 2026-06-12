import logging
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status

from middleware.auth import get_current_user
from services.supabase_service import (
    get_supabase_client,
    db_get_brand_document,
    db_update_brand_document,
    db_get_brand_documents,
    db_insert_brand_document
)
from services.document_service import parse_document, build_ai_context

logger = logging.getLogger("wagora-api")
router = APIRouter(prefix="/documents", tags=["Documents"])

class ParseRequest(BaseModel):
    document_id: str

class CreateDocRequest(BaseModel):
    name: str
    file_type: str
    size: str
    storage_path: str
    document_type: str
    campaign_id: Optional[str] = None

@router.get("/")
async def get_documents_endpoint(campaign_id: Optional[str] = None, user_id: str = Depends(get_current_user)):
    """
    Returns all brand documents for the user, optionally filtered by campaign.
    """
    try:
        docs = await db_get_brand_documents(user_id, campaign_id)
        return docs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_document_endpoint(req: CreateDocRequest, user_id: str = Depends(get_current_user)):
    """
    Creates a new brand document record.
    """
    try:
        import uuid
        doc_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": req.name,
            "file_type": req.file_type.upper(),
            "size": req.size,
            "storage_path": req.storage_path,
            "document_type": req.document_type,
            "campaign_id": req.campaign_id,
            "status": "Processing"
        }
        res = await db_insert_brand_document(doc_data)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{doc_id}")
async def delete_document_endpoint(doc_id: str, user_id: str = Depends(get_current_user)):
    """
    Deletes a brand document record.
    """
    try:
        doc = await db_get_brand_document(doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        if doc.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied: you do not own this document")
            
        # Try deleting from Supabase
        try:
            supabase = get_supabase_client()
            supabase.table("brand_documents").delete().eq("id", doc_id).execute()
        except Exception:
            pass
            
        # Delete from local DB
        from services.supabase_service import _read_local_db, _write_local_db
        db = _read_local_db()
        if doc_id in db["brand_documents"]:
            del db["brand_documents"][doc_id]
            _write_local_db(db)
            
        return {"status": "success", "message": "Document deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/parse")
async def parse_document_endpoint(req: ParseRequest, user_id: str = Depends(get_current_user)):
    """
    Downloads the file from Supabase storage, extracts its text, and saves it to the database.
    """
    # 1. Fetch document metadata and check ownership
    doc = await db_get_brand_document(req.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if doc.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied: you do not own this document")
        
    storage_path = doc.get("storage_path")
    filename = doc.get("name")
    
    if not storage_path:
        raise HTTPException(status_code=400, detail="Document storage path is missing")
        
    logger.info(f"Triggering parsing for doc: {filename} at path: {storage_path}")
    
    # Update status to Processing first
    await db_update_brand_document(req.document_id, {"status": "Processing"})
    
    # 2. Download from storage
    try:
        supabase = get_supabase_client()
        # Storage download returns raw bytes
        file_bytes = supabase.storage.from_("brand-documents").download(storage_path)
    except Exception as e:
        logger.error(f"Failed to download document from storage: {e}")
        await db_update_brand_document(req.document_id, {
            "status": "Error — reupload"
        })
        raise HTTPException(status_code=500, detail=f"Storage download failed: {str(e)}")
        
    # 3. Extract text
    try:
        parsed_text = parse_document(file_bytes, filename)
        
        # 4. Save to database
        await db_update_brand_document(req.document_id, {
            "parsed_text": parsed_text,
            "parsed_at": datetime.utcnow().isoformat(),
            "status": "Active"
        })
        
        logger.info(f"Successfully parsed document: {filename} ({len(parsed_text)} chars)")
        return {
            "status": "success",
            "message": "Document parsed successfully",
            "character_count": len(parsed_text)
        }
    except Exception as e:
        logger.error(f"Parsing failed for document {filename}: {e}")
        await db_update_brand_document(req.document_id, {
            "status": "Error — reupload"
        })
        return {
            "status": "error",
            "message": f"Failed to parse document: {str(e)}"
        }

@router.get("/context")
async def get_compiled_context(campaign_id: Optional[str] = None, user_id: str = Depends(get_current_user)):
    """
    Returns the compiled text context compiled from all active brand/campaign documents.
    """
    try:
        context = await build_ai_context(user_id, campaign_id)
        return {
            "context": context,
            "character_count": len(context)
        }
    except Exception as e:
        logger.error(f"Failed to compile document context: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to build context: {str(e)}")
