import json
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def format_currency(val: float, currency_code: str) -> str:
    """
    Formats numeric amount with appropriate currency symbols and comma separators.
    """
    if val == int(val):
        formatted_val = f"{int(val):,}"
    else:
        formatted_val = f"{val:,.2f}"
        
    symbol = "$"
    if currency_code == "NGN":
        symbol = "₦"
    elif currency_code == "USD":
        symbol = "$"
    elif currency_code == "GBP":
        symbol = "£"
    elif currency_code == "EUR":
        symbol = "€"
        
    return f"{symbol}{formatted_val}"

def generate_invoice_pdf(invoice_data: dict, template: str = "clean") -> bytes:
    """
    Generates a PDF invoice.
    Returns raw PDF bytes.
    Raises ValueError for invalid template names.
    """
    valid_templates = ["clean", "bold", "minimal", "classic", "modern", "minimalist"]
    if template not in valid_templates:
        raise ValueError(f"Invalid template name: {template}")
        
    # Standardize template keys
    if template in ["classic", "clean"]:
        norm_template = "clean"
    elif template in ["modern", "bold"]:
        norm_template = "bold"
    else:
        norm_template = "minimal"

    pdf_buffer = BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    story = []
    styles = getSampleStyleSheet()
    
    # Extract data securely
    invoice_number = invoice_data.get("invoice_number", "INV-UNKNOWN")
    client_name = invoice_data.get("client_name", "Valued Client")
    client_email = invoice_data.get("client_email")
    client_company = invoice_data.get("client_company")
    
    line_items = invoice_data.get("line_items") or []
    if isinstance(line_items, str):
        try:
            line_items = json.loads(line_items)
        except Exception:
            line_items = []
            
    subtotal = float(invoice_data.get("subtotal", 0))
    tax = float(invoice_data.get("tax", 0))
    total = float(invoice_data.get("total", 0))
    currency = invoice_data.get("currency", "USD")
    payment_details_type = invoice_data.get("payment_details_type")
    
    local_bank_name = invoice_data.get("local_bank_name")
    local_account_number = invoice_data.get("local_account_number")
    local_account_name = invoice_data.get("local_account_name")
    
    international_bank_name = invoice_data.get("international_bank_name")
    swift_code = invoice_data.get("swift_code")
    iban = invoice_data.get("iban")
    
    issued_at = invoice_data.get("issued_at", "")
    due_at = invoice_data.get("due_at")
    workspace_name = invoice_data.get("workspace_name", "Wagora Client")
    
    # Parse dates safely
    issued_date = issued_at.split("T")[0] if issued_at else "N/A"
    due_date = due_at.split("T")[0] if due_at else "N/A"
    
    # Register styles
    styles.add(ParagraphStyle(
        name='CleanTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#000000')
    ))
    styles.add(ParagraphStyle(
        name='CleanInvoiceNum',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#666666'),
        alignment=2
    ))
    styles.add(ParagraphStyle(
        name='CleanBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#333333')
    ))
    styles.add(ParagraphStyle(
        name='CleanBodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#000000')
    ))
    styles.add(ParagraphStyle(
        name='CleanFooter',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#999999'),
        alignment=1
    ))
    
    styles.add(ParagraphStyle(
        name='BoldHeaderTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#FFFFFF')
    ))
    styles.add(ParagraphStyle(
        name='BoldInvoiceNum',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#00C896'),
        alignment=2
    ))
    
    styles.add(ParagraphStyle(
        name='MinimalTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#000000')
    ))
    styles.add(ParagraphStyle(
        name='MinimalInvoiceNum',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#000000'),
        alignment=2
    ))
    styles.add(ParagraphStyle(
        name='MinimalBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#222222')
    ))
    styles.add(ParagraphStyle(
        name='MinimalBodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#000000')
    ))

    # Clean Template Layout
    if norm_template == "clean":
        header_data = [
            [Paragraph(workspace_name.upper(), styles['CleanTitle']), 
             Paragraph(f"INVOICE<br/><b>{invoice_number}</b>", styles['CleanInvoiceNum'])]
        ]
        header_table = Table(header_data, colWidths=[260, 260])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 15))
        
        hr = Table([[""]], colWidths=[520])
        hr.setStyle(TableStyle([
            ('LINEBELOW', (0,0), (-1,-1), 1, colors.HexColor('#CCCCCC')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(hr)
        story.append(Spacer(1, 15))
        
        client_html = f"<b>BILL TO:</b><br/>{client_name}<br/>"
        if client_company:
            client_html += f"{client_company}<br/>"
        if client_email:
            client_html += f"{client_email}"
            
        dates_html = f"<b>Date Issued:</b> {issued_date}<br/><b>Due Date:</b> {due_date}"
        
        info_data = [
            [Paragraph(client_html, styles['CleanBody']), 
             Paragraph(dates_html, styles['CleanBody'])]
        ]
        info_table = Table(info_data, colWidths=[260, 260])
        info_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 25))
        
        table_data = [
            [Paragraph("<b>Description</b>", styles['CleanBodyBold']), 
             Paragraph("<b>Qty</b>", styles['CleanBodyBold']), 
             Paragraph("<b>Rate</b>", styles['CleanBodyBold']), 
             Paragraph("<b>Amount</b>", styles['CleanBodyBold'])]
        ]
        
        for item in line_items:
            desc = item.get("description", "")
            qty = int(item.get("quantity", 1))
            rate = float(item.get("rate", 0))
            amt = qty * rate
            table_data.append([
                Paragraph(desc, styles['CleanBody']),
                Paragraph(str(qty), styles['CleanBody']),
                Paragraph(format_currency(rate, currency), styles['CleanBody']),
                Paragraph(format_currency(amt, currency), styles['CleanBody'])
            ])
            
        items_table = Table(table_data, colWidths=[280, 50, 95, 95])
        items_table_style = TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LINEBELOW', (0,0), (-1,0), 1, colors.HexColor('#333333')),
            ('LINEBELOW', (0,1), (-1,-1), 0.5, colors.HexColor('#EAEAEA')),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ])
        
        for idx in range(1, len(table_data)):
            if idx % 2 == 0:
                items_table_style.add('BACKGROUND', (0, idx), (-1, idx), colors.HexColor('#F9F9F9'))
                
        items_table.setStyle(items_table_style)
        story.append(items_table)
        story.append(Spacer(1, 20))
        
        totals_data = [
            [Paragraph("Subtotal:", styles['CleanBody']), Paragraph(format_currency(subtotal, currency), styles['CleanBody'])],
            [Paragraph("Tax (0%):", styles['CleanBody']), Paragraph(format_currency(tax, currency), styles['CleanBody'])],
            [Paragraph("<b>Total Due:</b>", styles['CleanBodyBold']), Paragraph(f"<b>{format_currency(total, currency)}</b>", styles['CleanBodyBold'])]
        ]
        totals_table = Table(totals_data, colWidths=[120, 100])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        
        container_table = Table([["", totals_table]], colWidths=[300, 220])
        container_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(container_table)
        story.append(Spacer(1, 35))
        
        # Build grey payment instructions box
        pay_box_lines = ["<b>PAYMENT INSTRUCTIONS</b>"]
        if payment_details_type == "local":
            pay_box_lines.append(f"<b>Bank Name:</b> {local_bank_name or 'N/A'}")
            pay_box_lines.append(f"<b>Account Number:</b> {local_account_number or 'N/A'}")
            pay_box_lines.append(f"<b>Account Name:</b> {local_account_name or 'N/A'}")
        elif payment_details_type == "international":
            pay_box_lines.append(f"<b>Bank Name:</b> {international_bank_name or 'N/A'}")
            pay_box_lines.append(f"<b>SWIFT/BIC Code:</b> {swift_code or 'N/A'}")
            pay_box_lines.append(f"<b>IBAN:</b> {iban or 'N/A'}")
        else:
            pay_box_lines.append("Contact sender for payment details")
        pay_box_lines.append("Payment is due within 14 days of invoice issue date. Quote invoice number in reference.")
        
        pay_table_data = [[Paragraph(line, styles['CleanBody'])] for line in pay_box_lines]
        pay_table = Table(pay_table_data, colWidths=[520])
        pay_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F2F2F2')),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 12),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E5E5')),
        ]))
        story.append(pay_table)
        story.append(Spacer(1, 30))
        story.append(Paragraph("Generated by Wagora", styles['CleanFooter']))

    # Bold Template Layout
    elif norm_template == "bold":
        header_text = f"<font color='white'><b>{workspace_name.upper()}</b></font>"
        header_p = Paragraph(header_text, styles['BoldHeaderTitle'])
        inv_text = f"INVOICE<br/><font color='#00C896'><b>{invoice_number}</b></font>"
        inv_p = Paragraph(inv_text, styles['BoldInvoiceNum'])
        
        header_table = Table([[header_p, inv_p]], colWidths=[300, 220])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#0D0F0C')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 20),
            ('BOTTOMPADDING', (0,0), (-1,-1), 20),
            ('LEFTPADDING', (0,0), (-1,-1), 15),
            ('RIGHTPADDING', (0,0), (-1,-1), 15),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 20))
        
        client_html = f"<b>BILL TO:</b><br/>{client_name}<br/>"
        if client_company:
            client_html += f"{client_company}<br/>"
        if client_email:
            client_html += f"{client_email}"
            
        dates_html = f"<b>Date Issued:</b> {issued_date}<br/><b>Due Date:</b> {due_date}"
        
        info_table = Table([[Paragraph(client_html, styles['CleanBody']), Paragraph(dates_html, styles['CleanBody'])]], colWidths=[260, 260])
        info_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 5),
            ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 25))
        
        table_data = [
            [Paragraph("<font color='white'><b>Description</b></font>", styles['CleanBodyBold']), 
             Paragraph("<font color='white'><b>Qty</b></font>", styles['CleanBodyBold']), 
             Paragraph("<font color='white'><b>Rate</b></font>", styles['CleanBodyBold']), 
             Paragraph("<font color='white'><b>Amount</b></font>", styles['CleanBodyBold'])]
        ]
        
        for item in line_items:
            desc = item.get("description", "")
            qty = int(item.get("quantity", 1))
            rate = float(item.get("rate", 0))
            amt = qty * rate
            table_data.append([
                Paragraph(desc, styles['CleanBody']),
                Paragraph(str(qty), styles['CleanBody']),
                Paragraph(format_currency(rate, currency), styles['CleanBody']),
                Paragraph(format_currency(amt, currency), styles['CleanBody'])
            ])
            
        items_table = Table(table_data, colWidths=[280, 50, 95, 95])
        items_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0D0F0C')),
            ('LINEBELOW', (0,1), (-1,-1), 0.5, colors.HexColor('#CCCCCC')),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ]))
        story.append(items_table)
        story.append(Spacer(1, 20))
        
        totals_data = [
            [Paragraph("Subtotal:", styles['CleanBody']), Paragraph(format_currency(subtotal, currency), styles['CleanBody'])],
            [Paragraph("Tax (0%):", styles['CleanBody']), Paragraph(format_currency(tax, currency), styles['CleanBody'])],
            [Paragraph("<font size='11'><b>Total Due:</b></font>", styles['CleanBodyBold']), Paragraph(f"<font size='11'><b>{format_currency(total, currency)}</b></font>", styles['CleanBodyBold'])]
        ]
        totals_table = Table(totals_data, colWidths=[120, 100])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        
        container_table = Table([["", totals_table]], colWidths=[300, 220])
        container_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(container_table)
        story.append(Spacer(1, 35))
        
        pay_box_lines = ["PAYMENT INSTRUCTIONS"]
        if payment_details_type == "local":
            pay_box_lines.append(f"Bank Name: {local_bank_name or 'N/A'}")
            pay_box_lines.append(f"Account Number: {local_account_number or 'N/A'}")
            pay_box_lines.append(f"Account Name: {local_account_name or 'N/A'}")
        elif payment_details_type == "international":
            pay_box_lines.append(f"Bank Name: {international_bank_name or 'N/A'}")
            pay_box_lines.append(f"SWIFT/BIC Code: {swift_code or 'N/A'}")
            pay_box_lines.append(f"IBAN: {iban or 'N/A'}")
        else:
            pay_box_lines.append("Contact sender for payment details")
        pay_box_lines.append("Payment is due within 14 days.")
        
        pay_table_data = [[Paragraph(f"<b>{line}</b>" if line == "PAYMENT INSTRUCTIONS" else line, styles['CleanBody'])] for line in pay_box_lines]
        pay_table = Table(pay_table_data, colWidths=[520])
        pay_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#0D0F0C')),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ]))
        story.append(pay_table)

    # Minimal Template Layout
    else:
        header_data = [
            [Paragraph(workspace_name.upper(), styles['MinimalBodyBold']), 
             Paragraph(f"<font size='20'><b>{invoice_number}</b></font>", styles['MinimalInvoiceNum'])]
        ]
        header_table = Table(header_data, colWidths=[200, 320])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 10))
        
        dots = ". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ."
        story.append(Paragraph(dots, styles['MinimalBody']))
        story.append(Spacer(1, 10))
        
        client_html = f"<b>BILL TO</b><br/>{client_name}<br/>"
        if client_company:
            client_html += f"{client_company}<br/>"
        if client_email:
            client_html += f"{client_email}"
            
        dates_html = f"<b>ISSUED</b> {issued_date}<br/><b>DUE</b> {due_date}"
        
        info_table = Table([[Paragraph(client_html, styles['MinimalBody']), Paragraph(dates_html, styles['MinimalBody'])]], colWidths=[260, 260])
        info_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 10))
        
        story.append(Paragraph(dots, styles['MinimalBody']))
        story.append(Spacer(1, 10))
        
        table_data = [
            [Paragraph("<b>Description</b>", styles['MinimalBodyBold']), 
             Paragraph("<b>Qty</b>", styles['MinimalBodyBold']), 
             Paragraph("<b>Rate</b>", styles['MinimalBodyBold']), 
             Paragraph("<b>Amount</b>", styles['MinimalBodyBold'])]
        ]
        
        for item in line_items:
            desc = item.get("description", "")
            qty = int(item.get("quantity", 1))
            rate = float(item.get("rate", 0))
            amt = qty * rate
            table_data.append([
                Paragraph(desc, styles['MinimalBody']),
                Paragraph(str(qty), styles['MinimalBody']),
                Paragraph(format_currency(rate, currency), styles['MinimalBody']),
                Paragraph(format_currency(amt, currency), styles['MinimalBody'])
            ])
            
        items_table = Table(table_data, colWidths=[300, 40, 90, 90])
        items_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ]))
        story.append(items_table)
        story.append(Spacer(1, 10))
        
        story.append(Paragraph(dots, styles['MinimalBody']))
        story.append(Spacer(1, 10))
        
        totals_data = [
            [Paragraph("Subtotal:", styles['MinimalBody']), Paragraph(format_currency(subtotal, currency), styles['MinimalBody'])],
            [Paragraph("Tax:", styles['MinimalBody']), Paragraph(format_currency(tax, currency), styles['MinimalBody'])],
            [Paragraph("<b>Total:</b>", styles['MinimalBodyBold']), Paragraph(f"<b>{format_currency(total, currency)}</b>", styles['MinimalBodyBold'])]
        ]
        totals_table = Table(totals_data, colWidths=[120, 100])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        
        container_table = Table([["", totals_table]], colWidths=[300, 220])
        container_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(container_table)
        story.append(Spacer(1, 15))
        
        story.append(Paragraph(dots, styles['MinimalBody']))
        story.append(Spacer(1, 10))
        
        pay_html = "<b>PAYMENT INSTRUCTIONS</b><br/>"
        if payment_details_type == "local":
            pay_html += f"Bank: {local_bank_name or 'N/A'}<br/>Account No: {local_account_number or 'N/A'}<br/>Account Name: {local_account_name or 'N/A'}"
        elif payment_details_type == "international":
            pay_html += f"Bank: {international_bank_name or 'N/A'}<br/>SWIFT: {swift_code or 'N/A'}<br/>IBAN: {iban or 'N/A'}"
        else:
            pay_html += "Contact sender for payment details"
            
        story.append(Paragraph(pay_html, styles['MinimalBody']))
        
    doc.build(story)
    pdf_bytes = pdf_buffer.getvalue()
    pdf_buffer.close()
    return pdf_bytes
