import sys
import os

# Adjust paths to import from backend
sys.path.append(os.path.join(os.path.dirname(__file__)))

from services.pdf_service import generate_invoice_pdf

# Mock invoice data matching the requested schema
test_data_ngn = {
    "invoice_number": "WGR-2026-001",
    "client_name": "Leke Alder",
    "client_email": "leke@alderconsulting.com",
    "client_company": "Alder Consulting",
    "line_items": [
        {
            "description": "Brand Positioning Strategy & Identity",
            "quantity": 1,
            "unit_price": 1500000,
            "rate": 1500000,
            "total": 1500000
        },
        {
            "description": "Custom Webflow Presentation Platform",
            "quantity": 1,
            "unit_price": 500000,
            "rate": 500000,
            "total": 500000
        }
    ],
    "subtotal": 2000000,
    "tax": 0,
    "total": 2000000,
    "currency": "NGN",
    "payment_details_type": "local",
    "local_bank_name": "GTBank Plc",
    "local_account_number": "0124896745",
    "local_account_name": "Wagora Technology Limited",
    "workspace_name": "DesignForge",
    "workspace_logo_url": None,
    "issued_at": "2026-06-07T10:00:00Z",
    "due_at": "2026-06-21T10:00:00Z"
}

test_data_usd = {
    "invoice_number": "WGR-2026-002",
    "client_name": "Sarah Jenkins",
    "client_email": "sarah@acme.com",
    "client_company": "Acme Corp",
    "line_items": [
        {
            "description": "Design Consultation Services",
            "quantity": 5,
            "unit_price": 150,
            "rate": 150,
            "total": 750
        }
    ],
    "subtotal": 750,
    "tax": 0,
    "total": 750,
    "currency": "USD",
    "payment_details_type": "international",
    "international_bank_name": "GTBank London",
    "swift_code": "GTBKGB2LXXX",
    "iban": "GB12GTBK30291048209381",
    "workspace_name": "Wagora Technology",
    "workspace_logo_url": None,
    "issued_at": "2026-06-07T10:00:00Z",
    "due_at": "2026-06-21T10:00:00Z"
}

def main():
    # 1. Clean template (Classic)
    pdf_clean = generate_invoice_pdf(test_data_ngn, "clean")
    with open("test_clean.pdf", "wb") as f:
        f.write(pdf_clean)
    print("Generated test_clean.pdf successfully")

    # 2. Bold template (Modern)
    pdf_bold = generate_invoice_pdf(test_data_usd, "bold")
    with open("test_bold.pdf", "wb") as f:
        f.write(pdf_bold)
    print("Generated test_bold.pdf successfully")

    # 3. Minimal template (Minimalist)
    pdf_minimal = generate_invoice_pdf(test_data_usd, "minimal")
    with open("test_minimal.pdf", "wb") as f:
        f.write(pdf_minimal)
    print("Generated test_minimal.pdf successfully")

if __name__ == "__main__":
    main()
