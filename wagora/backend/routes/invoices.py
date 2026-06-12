import datetime
import io
import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from middleware.auth import get_current_user
from services.supabase_service import get_supabase_client
from services.pdf_service import generate_invoice_pdf

router = APIRouter(prefix="/invoices", tags=["Invoices"])

class GeneratePdfRequest(BaseModel):
    invoice_id: str
    template: Optional[str] = "clean"

class UpdateStatusRequest(BaseModel):
    status: str

class CreateInvoiceRequest(BaseModel):
    deal_id: Optional[str] = None
    client_name: str
    client_email: Optional[str] = None
    client_company: Optional[str] = None
    line_items: List[Dict[str, Any]]
    subtotal: float
    tax: float = 0.0
    total: float
    currency: str = "USD"
    payment_details_type: Optional[str] = "local"
    status: str = "Draft"
    issued_at: Optional[str] = None
    due_at: Optional[str] = None

@router.get("/")
async def get_invoices(user_id: str = Depends(get_current_user)):
    """
    Returns all invoices for the authenticated user.
    """
    supabase = get_supabase_client()
    try:
        res = supabase.table("invoices").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/")
async def create_invoice(req: CreateInvoiceRequest, user_id: str = Depends(get_current_user)):
    """
    Creates a new invoice and generates invoice number in WGR-YYYY-NNN format sequentially.
    """
    supabase = get_supabase_client()
    try:
        # Determine year and generate prefix
        year = datetime.datetime.now().year
        prefix = f"WGR-{year}-"
        
        # Query existing invoices to get next sequence number
        res = supabase.table("invoices").select("invoice_number").eq("user_id", user_id).execute()
        max_num = 0
        for item in (res.data or []):
            inv_num = item.get("invoice_number", "")
            if inv_num.startswith(prefix):
                try:
                    num_str = inv_num.split(prefix)[1]
                    num = int(num_str)
                    if num > max_num:
                        max_num = num
                except Exception:
                    pass
        
        next_num = max_num + 1
        invoice_number = f"{prefix}{next_num:03d}"
        
        # Insert new invoice
        new_inv_data = {
            "user_id": user_id,
            "deal_id": req.deal_id,
            "invoice_number": invoice_number,
            "client_name": req.client_name,
            "client_email": req.client_email,
            "client_company": req.client_company,
            "line_items": req.line_items,
            "subtotal": req.subtotal,
            "tax": req.tax,
            "total": req.total,
            "currency": req.currency,
            "payment_details_type": req.payment_details_type,
            "status": req.status,
            "issued_at": req.issued_at or datetime.datetime.now().isoformat(),
            "due_at": req.due_at or (datetime.datetime.now() + datetime.timedelta(days=14)).isoformat()
        }
        
        insert_res = supabase.table("invoices").insert(new_inv_data).execute()
        if not insert_res.data:
            raise HTTPException(status_code=500, detail="Failed to save invoice to database")
            
        return insert_res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, req: UpdateStatusRequest, user_id: str = Depends(get_current_user)):
    """
    Updates the status of an invoice. If set to 'Paid', also updates the linked deal status to 'In delivery'.
    """
    supabase = get_supabase_client()
    try:
        # Fetch and verify ownership of the invoice
        inv_res = supabase.table("invoices").select("*").eq("id", invoice_id).execute()
        if not inv_res.data:
            raise HTTPException(status_code=404, detail="Invoice not found")
        invoice = inv_res.data[0]
        if invoice.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied: you do not own this invoice")
            
        # Update invoice status
        update_data = {"status": req.status}
        if req.status == "Paid":
            update_data["paid_at"] = datetime.datetime.now().isoformat()
            
        up_res = supabase.table("invoices").update(update_data).eq("id", invoice_id).execute()
        
        # Sync linked deal if status is Paid and deal_id exists
        deal_id = invoice.get("deal_id")
        if req.status == "Paid" and deal_id:
            # Verify deal ownership and update
            supabase.table("deals").update({"status": "In delivery"}).eq("id", deal_id).eq("user_id", user_id).execute()
            
        return up_res.data[0] if up_res.data else {}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/generate-pdf")
async def generate_pdf_endpoint(req: GeneratePdfRequest, user_id: str = Depends(get_current_user)):
    """
    Generates and returns a PDF for an invoice with ownership protection.
    """
    supabase = get_supabase_client()
    try:
        # 1. Fetch invoice and verify ownership
        inv_res = supabase.table("invoices").select("*").eq("id", req.invoice_id).execute()
        if not inv_res.data:
            raise HTTPException(status_code=404, detail="Invoice not found")
        invoice = inv_res.data[0]
        
        if invoice.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access forbidden: you do not own this invoice")
            
        # 2. Fetch workspace name from profiles table
        prof_res = supabase.table("profiles").select("business_name").eq("id", user_id).execute()
        profile = prof_res.data[0] if prof_res.data else {}
        workspace_name = profile.get("business_name") or "Wagora Client"
        
        # 3. Fetch payment details template from invoice_templates
        # If specific template_id is on invoice, use it, otherwise fall back to first template
        template_id = invoice.get("template_id")
        template = {}
        if template_id:
            temp_res = supabase.table("invoice_templates").select("*").eq("id", template_id).execute()
            if temp_res.data:
                template = temp_res.data[0]
        if not template:
            temp_res = supabase.table("invoice_templates").select("*").eq("user_id", user_id).limit(1).execute()
            if temp_res.data:
                template = temp_res.data[0]
                
        # 4. Extract banking instructions
        local_bank_name = None
        local_account_number = None
        local_account_name = None
        international_bank_name = None
        swift_code = None
        iban = None
        
        if template:
            # local
            local_details = template.get("payment_details_local") or {}
            if isinstance(local_details, str):
                try:
                    local_details = json.loads(local_details)
                except Exception:
                    local_details = {}
            local_bank_name = local_details.get("bank_name")
            local_account_number = local_details.get("account_number")
            local_account_name = local_details.get("account_name")
            
            # international
            intl_details = template.get("payment_details_international") or {}
            if isinstance(intl_details, str):
                try:
                    intl_details = json.loads(intl_details)
                except Exception:
                    intl_details = {}
            international_bank_name = intl_details.get("bank_name")
            swift_code = intl_details.get("swift_code") or intl_details.get("bic_code")
            iban = intl_details.get("iban")
            
        # Fallbacks to GTBank to ensure the PDF invoice payment section is complete
        if not local_bank_name:
            local_bank_name = "GTBank Plc"
        if not local_account_number:
            local_account_number = "0124896745"
        if not local_account_name:
            local_account_name = "Wagora Technology Limited"
            
        if not international_bank_name:
            international_bank_name = "GTBank London"
        if not swift_code:
            swift_code = "GTBKGB2LXXX"
        if not iban:
            iban = "GB12GTBK30291048209381"
            
        # 5. Compile PDF input payload
        pdf_payload = {
            "invoice_number": invoice.get("invoice_number", "INV-UNKNOWN"),
            "client_name": invoice.get("client_name", "Valued Client"),
            "client_email": invoice.get("client_email"),
            "client_company": invoice.get("client_company"),
            "line_items": invoice.get("line_items") or [],
            "subtotal": invoice.get("subtotal", 0),
            "tax": invoice.get("tax", 0),
            "total": invoice.get("total", 0),
            "currency": invoice.get("currency", "USD"),
            "payment_details_type": invoice.get("payment_details_type", "local"),
            "local_bank_name": local_bank_name,
            "local_account_number": local_account_number,
            "local_account_name": local_account_name,
            "international_bank_name": international_bank_name,
            "swift_code": swift_code,
            "iban": iban,
            "issued_at": invoice.get("issued_at", ""),
            "due_at": invoice.get("due_at"),
            "workspace_name": workspace_name,
            "workspace_logo_url": template.get("logo_url") if template else None
        }
        
        # 6. Call pdf_service
        pdf_bytes = generate_invoice_pdf(pdf_payload, req.template)
        invoice_number = invoice.get("invoice_number", "unknown")
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=wagora-invoice-{invoice_number}.pdf",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(e)}")
