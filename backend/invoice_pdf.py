"""
Invoice PDF renderer for Insight Networks — matches the reference design
provided by the customer (dark navy header band, blue accent panels, QR code,
Bill-To/Invoice-For dual panels, line-item table, GST breakdown, amount in
words, payment details, authorized signature, and blue footer strip).
"""
from __future__ import annotations

import io
from pathlib import Path
from typing import Any, Dict

# ReportLab imports done lazily so failure surfaces at first-use time.

# --- Brand constants (matches website theme + reference invoice) --------------
COMPANY = {
    "name": "Insight Networks",
    "tagline_1": "SMART NETWORKS.",
    "tagline_2": "STRONGER BUSINESS.",
    "tagline_3": "BETTER TOMORROW.",
    "sub_tagline": "CONNECTING TODAY. POWERING TOMORROW.",
    "address_lines": [
        "Block-B Aashima Royal City,",
        "Bhopal-462043,",
        "Madhya Pradesh, India",
    ],
    "phone": "+91 9302452424",
    "email": "contact@insightnet.in",
    "web": "www.insightnet.in",
    "gstin": "23AOUPK8162M2Z7",
    "bank_name": "Axis Bank",
    "bank_ifsc": "UTIB0002593",
    "bank_account": "916020057765758",
    "authorized_signatory": "Amit Khare",
}


def _make_qr_png(text: str) -> bytes:
    """Generate a compact QR-code PNG for embedding in the invoice."""
    import qrcode
    qr = qrcode.QRCode(
        version=None, error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=6, border=1,
    )
    qr.add_data(text or COMPANY["web"])
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0A1A33", back_color="#FFFFFF")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _num_to_words_inr(rupees: float) -> str:
    """Indian-numbering rupees-in-words."""
    rupees = round(rupees, 2)
    n = int(rupees)
    paise = int(round((rupees - n) * 100))

    under_20 = [
        "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
        "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
        "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
    ]
    tens_names = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty",
                  "Seventy", "Eighty", "Ninety"]

    def _u100(x):
        if x < 20:
            return under_20[x]
        t, u = divmod(x, 10)
        return tens_names[t] + (" " + under_20[u] if u else "")

    def _u1000(x):
        h, r = divmod(x, 100)
        parts = []
        if h:
            parts.append(under_20[h] + " Hundred")
        if r:
            parts.append(_u100(r))
        return " ".join(parts).strip()

    def _ind(x):
        if x == 0:
            return "Zero"
        parts = []
        crore, x = divmod(x, 10000000)
        lakh, x = divmod(x, 100000)
        thousand, x = divmod(x, 1000)
        hundred = x
        if crore:
            parts.append(_u100(crore) + " Crore")
        if lakh:
            parts.append(_u100(lakh) + " Lakh")
        if thousand:
            parts.append(_u100(thousand) + " Thousand")
        if hundred:
            parts.append(_u1000(hundred))
        return " ".join(parts).strip()

    words = _ind(n) + " Rupees"
    if paise:
        words += " and " + _u100(paise) + " Paise"
    words += " Only"
    return words


def _register_fonts():
    """Register bundled DejaVu Sans for full Unicode (₹, ✓, →) support."""
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    assets = Path(__file__).parent / "assets"
    if "DejaVuSans" not in pdfmetrics.getRegisteredFontNames():
        try:
            pdfmetrics.registerFont(TTFont("DejaVuSans", str(assets / "DejaVuSans.ttf")))
            pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(assets / "DejaVuSans-Bold.ttf")))
            pdfmetrics.registerFontFamily(
                "DejaVuSans",
                normal="DejaVuSans", bold="DejaVuSans-Bold",
                italic="DejaVuSans", boldItalic="DejaVuSans-Bold",
            )
            return "DejaVuSans", "DejaVuSans-Bold"
        except Exception:
            pass
    if "DejaVuSans" in pdfmetrics.getRegisteredFontNames():
        return "DejaVuSans", "DejaVuSans-Bold"
    return "Helvetica", "Helvetica-Bold"


def build_invoice_pdf(inv: Dict[str, Any]) -> bytes:
    """
    Render an Insight Networks invoice PDF matching the customer's reference design.
    Uses low-level canvas primitives for the header/footer decorations and
    positioned Table flowables for the body content.
    """
    from reportlab.pdfgen import canvas as canvas_mod
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.platypus import Table, TableStyle, Paragraph, Image
    from reportlab.pdfbase.pdfmetrics import stringWidth

    PAGE_W, PAGE_H = A4  # 595 x 842 pts
    FONT_R, FONT_B = _register_fonts()

    NAVY = colors.HexColor("#0A1A33")
    NAVY_DARK = colors.HexColor("#050E1F")
    BLUE = colors.HexColor("#1E88FF")
    LIGHT_BLUE_BG = colors.HexColor("#E9F3FF")
    GREY_50 = colors.HexColor("#F8FAFC")
    GREY_200 = colors.HexColor("#E2E8F0")
    GREY_500 = colors.HexColor("#64748B")
    WHITE = colors.white

    currency_sym = "\u20b9"

    def money_from_cents(cents):
        try:
            v = int(cents or 0) / 100.0
        except Exception:
            v = 0.0
        return f"{v:,.2f}"

    def money_paren(cents):
        return f"{currency_sym} {money_from_cents(cents)}"

    subtotal_cents = int(inv.get("amount_cents") or 0)
    other_cents = int(inv.get("other_charge_cents") or 0) if inv.get("other_charge_applicable") else 0
    cgst_cents = int(inv.get("cgst_amount_cents") or 0)
    sgst_cents = int(inv.get("sgst_amount_cents") or 0)
    igst_cents = int(inv.get("igst_amount_cents") or 0)
    total_cents = int(inv.get("total_amount_cents") or (subtotal_cents + other_cents + cgst_cents + sgst_cents + igst_cents))

    total_rupees = total_cents / 100.0

    invoice_no = inv.get("invoice_no") or inv.get("id") or "-"
    invoice_date = inv.get("invoice_date") or "-"
    due_date = inv.get("due_by") or "-"
    customer_id = inv.get("subscriber_id") or inv.get("subscriber_account_no") or "-"

    subscriber_name = inv.get("subscriber_name") or "-"
    period_from = inv.get("period_from") or "-"
    period_to = inv.get("period_to") or "-"
    package_name = inv.get("location_package_name") or "-"

    # QR code payload — UPI intent so any phone can scan-to-pay
    upi_intent = (
        f"upi://pay?pa=insightnetworks@axisbank"
        f"&pn={COMPANY['name'].replace(' ', '%20')}"
        f"&am={total_rupees:.2f}"
        f"&cu=INR"
        f"&tn=INV-{invoice_no}"
    )

    buf = io.BytesIO()
    c = canvas_mod.Canvas(buf, pagesize=A4)
    c.setTitle(f"Tax Invoice {invoice_no}")
    c.setAuthor(COMPANY["name"])

    # --------- HEADER BAND (navy blue) ------------------------------------
    HEADER_H = 45 * mm
    c.setFillColor(NAVY_DARK)
    c.rect(0, PAGE_H - HEADER_H, PAGE_W, HEADER_H, fill=1, stroke=0)

    # Subtle diagonal highlight (fake fiber-optic streaks)
    c.setStrokeColor(colors.HexColor("#1E3A8A"))
    c.setLineWidth(0.4)
    for i in range(0, 12):
        y = PAGE_H - HEADER_H + i * 4
        c.line(PAGE_W * 0.55, y, PAGE_W, y + 25)

    # Logo (left)
    logo_path = Path(__file__).parent / "assets" / "logo.png"
    if logo_path.exists():
        c.drawImage(
            str(logo_path),
            10 * mm, PAGE_H - HEADER_H + 12 * mm,
            width=50 * mm, height=22 * mm,
            preserveAspectRatio=True, mask="auto",
        )

    # Sub-tagline under logo
    c.setFillColor(WHITE)
    c.setFont(FONT_B, 6.5)
    c.drawString(10 * mm, PAGE_H - HEADER_H + 8 * mm, COMPANY["sub_tagline"])

    # Main tagline (centered-right area)
    c.setFont(FONT_B, 15)
    c.setFillColor(WHITE)
    c.drawString(80 * mm, PAGE_H - 15 * mm, COMPANY["tagline_1"])
    c.drawString(80 * mm, PAGE_H - 22 * mm, COMPANY["tagline_2"])
    c.setFillColor(BLUE)
    c.drawString(80 * mm, PAGE_H - 29 * mm, COMPANY["tagline_3"])

    # 4 feature badges (below tagline, above the divider)
    c.setFont(FONT_B, 6.5)
    badges = [
        ("HIGH SPEED", "UP TO 1 Gbps"),
        ("100%", "RELIABLE"),
        ("SECURE", "NETWORK"),
        ("24/7", "SUPPORT"),
    ]
    badge_x_start = 80 * mm
    badge_spacing = 26 * mm
    for i, (line1, line2) in enumerate(badges):
        bx = badge_x_start + i * badge_spacing
        by = PAGE_H - HEADER_H + 5 * mm
        # Circular icon holder
        c.setFillColor(BLUE)
        c.circle(bx + 4, by + 3, 3, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.drawString(bx + 9, by + 5, line1)
        c.setFillColor(colors.HexColor("#93C5FD"))
        c.drawString(bx + 9, by + 1, line2)

    # --------- CONTACT STRIP (below header) --------------------------------
    STRIP_TOP = PAGE_H - HEADER_H - 2 * mm
    c.setFillColor(WHITE)
    STRIP_H = 22 * mm
    c.rect(0, STRIP_TOP - STRIP_H, PAGE_W, STRIP_H, fill=1, stroke=0)

    # Column 1: Address
    c.setFillColor(BLUE)
    c.circle(14 * mm, STRIP_TOP - 8 * mm, 2.5, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont(FONT_B, 8.5)
    c.drawString(19 * mm, STRIP_TOP - 6 * mm, COMPANY["name"])
    c.setFont(FONT_R, 7.2)
    c.setFillColor(GREY_500)
    for i, line in enumerate(COMPANY["address_lines"]):
        c.drawString(19 * mm, STRIP_TOP - 10 * mm - i * 3 * mm, line)

    # Column 2: Phone + Email + Web (icons + text)
    contact_x = 78 * mm
    c.setFillColor(BLUE)
    c.circle(contact_x + 2, STRIP_TOP - 6.5 * mm, 2.2, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont(FONT_R, 8)
    c.drawString(contact_x + 6, STRIP_TOP - 6 * mm, COMPANY["phone"])
    c.setFillColor(BLUE)
    c.circle(contact_x + 2, STRIP_TOP - 12 * mm, 2.2, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.drawString(contact_x + 6, STRIP_TOP - 11 * mm, COMPANY["email"])
    c.setFillColor(BLUE)
    c.circle(contact_x + 2, STRIP_TOP - 17.5 * mm, 2.2, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.drawString(contact_x + 6, STRIP_TOP - 16.5 * mm, COMPANY["web"])

    # Column 3: GSTIN + QR code
    gst_x = 128 * mm
    c.setFillColor(NAVY)
    c.setFont(FONT_B, 8.5)
    c.drawString(gst_x, STRIP_TOP - 6 * mm, "GSTIN :")
    c.setFont(FONT_R, 8.5)
    c.drawString(gst_x + 12 * mm, STRIP_TOP - 6 * mm, COMPANY["gstin"])

    qr_png = _make_qr_png(upi_intent)
    from reportlab.lib.utils import ImageReader
    qr_reader = ImageReader(io.BytesIO(qr_png))
    c.drawImage(qr_reader, PAGE_W - 32 * mm, STRIP_TOP - 20 * mm,
                width=18 * mm, height=18 * mm, mask="auto")

    # --------- INVOICE title (right side) ----------------------------------
    body_top = STRIP_TOP - STRIP_H - 6 * mm
    c.setFillColor(BLUE)
    c.setFont(FONT_B, 32)
    c.drawRightString(PAGE_W - 15 * mm, body_top - 8 * mm, "INVOICE")

    # --------- BILL TO panel (left) ---------------------------------------
    panel_top = body_top - 16 * mm
    # BILL TO tab
    c.setFillColor(BLUE)
    c.roundRect(15 * mm, panel_top - 6 * mm, 32 * mm, 6 * mm, 1 * mm, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont(FONT_B, 9)
    c.drawString(20 * mm, panel_top - 4.5 * mm, "BILL TO")

    # Bill-To content box
    box_h = 34 * mm
    c.setStrokeColor(GREY_200)
    c.setLineWidth(0.5)
    c.setFillColor(GREY_50)
    c.roundRect(15 * mm, panel_top - 6 * mm - box_h, 82 * mm, box_h, 1 * mm, fill=1, stroke=1)

    # Bill-to details
    c.setFillColor(NAVY)
    c.setFont(FONT_B, 10.5)
    c.drawString(19 * mm, panel_top - 6 * mm - 7 * mm, subscriber_name)
    c.setFont(FONT_R, 8)
    c.setFillColor(GREY_500)
    bill_details = [
        f"Customer ID  :  {customer_id}",
        f"Package  :  {package_name}",
        "Bhopal, Madhya Pradesh, India",
        f"Email  :  {inv.get('subscriber_email') or 'N/A'}",
        f"Phone  :  {inv.get('subscriber_phone') or 'N/A'}",
    ]
    for i, line in enumerate(bill_details):
        c.drawString(19 * mm, panel_top - 6 * mm - 12 * mm - i * 4 * mm, line)

    # --------- INVOICE FOR panel (middle) ---------------------------------
    inv_for_x = 100 * mm
    inv_for_w = 45 * mm
    c.setFillColor(BLUE)
    c.roundRect(inv_for_x, panel_top - 6 * mm, 40 * mm, 6 * mm, 1 * mm, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont(FONT_B, 9)
    c.drawString(inv_for_x + 5, panel_top - 4.5 * mm, "INVOICE FOR")

    c.setStrokeColor(GREY_200)
    c.setFillColor(GREY_50)
    c.roundRect(inv_for_x, panel_top - 6 * mm - box_h, inv_for_w, box_h, 1 * mm, fill=1, stroke=1)

    c.setFillColor(NAVY)
    c.setFont(FONT_B, 10)
    c.drawString(inv_for_x + 4, panel_top - 6 * mm - 7 * mm, "Internet Service &")
    c.drawString(inv_for_x + 4, panel_top - 6 * mm - 11 * mm, "Managed Network")
    c.setFont(FONT_R, 7.5)
    c.setFillColor(GREY_500)
    c.drawString(inv_for_x + 4, panel_top - 6 * mm - 18 * mm, "Billing Period:")
    c.setFillColor(NAVY)
    c.setFont(FONT_B, 7.5)
    c.drawString(inv_for_x + 4, panel_top - 6 * mm - 22 * mm, f"{period_from}")
    c.drawString(inv_for_x + 4, panel_top - 6 * mm - 26 * mm, f"to  {period_to}")

    # --------- Right column: invoice metadata -----------------------------
    meta_x = 150 * mm
    labels = [
        ("Invoice No.", str(invoice_no)),
        ("Invoice Date", str(invoice_date)),
        ("Due Date", str(due_date)),
        ("Customer ID", str(customer_id)),
    ]
    for i, (label, value) in enumerate(labels):
        y = panel_top - 6 * mm - 6 * mm - i * 8 * mm
        c.setFont(FONT_R, 8.5)
        c.setFillColor(GREY_500)
        c.drawString(meta_x, y, label)
        c.setFont(FONT_B, 9)
        c.setFillColor(NAVY)
        c.drawString(meta_x + 24 * mm, y, ":")
        c.drawString(meta_x + 27 * mm, y, value)

    # --------- LINE ITEMS TABLE -------------------------------------------
    items_top = panel_top - 6 * mm - box_h - 8 * mm

    line_items = [
        {
            "sr": "1",
            "description": inv.get("description") or "Internet Service Charges",
            "sub": f"Package: {package_name}",
            "plan": package_name,
            "qty": "1",
            "unit": money_from_cents(subtotal_cents),
            "amount": money_from_cents(subtotal_cents),
        }
    ]
    if other_cents > 0:
        line_items.append({
            "sr": str(len(line_items) + 1),
            "description": inv.get("other_charge_description") or "Other Charges",
            "sub": "",
            "plan": "-",
            "qty": "1",
            "unit": money_from_cents(other_cents),
            "amount": money_from_cents(other_cents),
        })

    header_row = [
        Paragraph("<b>SR NO.</b>", ParagraphStyle("h", fontName=FONT_B, fontSize=8, textColor=WHITE, alignment=TA_CENTER)),
        Paragraph("<b>DESCRIPTION</b>", ParagraphStyle("h", fontName=FONT_B, fontSize=8, textColor=WHITE)),
        Paragraph("<b>PLAN / DETAILS</b>", ParagraphStyle("h", fontName=FONT_B, fontSize=8, textColor=WHITE, alignment=TA_CENTER)),
        Paragraph("<b>QTY</b>", ParagraphStyle("h", fontName=FONT_B, fontSize=8, textColor=WHITE, alignment=TA_CENTER)),
        Paragraph("<b>UNIT PRICE (INR)</b>", ParagraphStyle("h", fontName=FONT_B, fontSize=8, textColor=WHITE, alignment=TA_RIGHT)),
        Paragraph("<b>AMOUNT (INR)</b>", ParagraphStyle("h", fontName=FONT_B, fontSize=8, textColor=WHITE, alignment=TA_RIGHT)),
    ]
    table_data = [header_row]
    for item in line_items:
        desc_html = f"<b>{item['description']}</b>"
        if item["sub"]:
            desc_html += f"<br/><font size=7 color='#64748B'>{item['sub']}</font>"
        table_data.append([
            Paragraph(item["sr"], ParagraphStyle("c", fontName=FONT_R, fontSize=9, textColor=NAVY, alignment=TA_CENTER)),
            Paragraph(desc_html, ParagraphStyle("d", fontName=FONT_R, fontSize=9, textColor=NAVY, leading=11)),
            Paragraph(item["plan"], ParagraphStyle("p", fontName=FONT_R, fontSize=9, textColor=NAVY, alignment=TA_CENTER)),
            Paragraph(item["qty"], ParagraphStyle("q", fontName=FONT_R, fontSize=9, textColor=NAVY, alignment=TA_CENTER)),
            Paragraph(item["unit"], ParagraphStyle("u", fontName=FONT_B, fontSize=9, textColor=NAVY, alignment=TA_RIGHT)),
            Paragraph(item["amount"], ParagraphStyle("a", fontName=FONT_B, fontSize=9, textColor=NAVY, alignment=TA_RIGHT)),
        ])

    items_table = Table(
        table_data,
        colWidths=[16 * mm, 55 * mm, 34 * mm, 12 * mm, 30 * mm, 30 * mm],
    )
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("BOX", (0, 0), (-1, -1), 0.5, GREY_200),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, GREY_200),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    tbl_w, tbl_h = items_table.wrapOn(c, PAGE_W - 30 * mm, PAGE_H)
    items_table.drawOn(c, 15 * mm, items_top - tbl_h)

    # --------- AMOUNT IN WORDS + TOTALS -----------------------------------
    words_top = items_top - tbl_h - 4 * mm
    # Amount in words box (left, ~55% width)
    aw_w = 110 * mm
    aw_h = 28 * mm
    c.setFillColor(BLUE)
    c.roundRect(15 * mm, words_top - 7 * mm, 55 * mm, 7 * mm, 1 * mm, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont(FONT_B, 9)
    c.drawString(20 * mm, words_top - 5 * mm, "AMOUNT IN WORDS")

    c.setStrokeColor(GREY_200)
    c.setFillColor(GREY_50)
    c.roundRect(15 * mm, words_top - 7 * mm - (aw_h - 7 * mm), aw_w, aw_h - 7 * mm, 1 * mm, fill=1, stroke=1)
    c.setFillColor(NAVY)
    c.setFont(FONT_B, 10.5)
    words = _num_to_words_inr(total_rupees)
    # Wrap words to fit
    max_width = aw_w - 10 * mm
    lines = []
    current = ""
    for word in words.split():
        test = (current + " " + word).strip()
        if stringWidth(test, FONT_B, 10.5) <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    for i, line in enumerate(lines[:3]):
        c.drawString(19 * mm, words_top - 12 * mm - i * 5 * mm, line)

    # Totals box (right)
    totals_x = 130 * mm
    totals_w = 65 * mm
    row_h = 6 * mm
    totals_rows = [("SUBTOTAL", money_from_cents(subtotal_cents))]
    if other_cents:
        totals_rows.append(("OTHER CHARGES", money_from_cents(other_cents)))
    if inv.get("gst_applicable") and float(inv.get("sgst_rate") or 0) > 0:
        totals_rows.append((f"SGST ({inv.get('sgst_rate')}%)", money_from_cents(sgst_cents)))
    if inv.get("gst_applicable") and float(inv.get("cgst_rate") or 0) > 0:
        totals_rows.append((f"CGST ({inv.get('cgst_rate')}%)", money_from_cents(cgst_cents)))
    if inv.get("gst_applicable") and float(inv.get("igst_rate") or 0) > 0:
        totals_rows.append((f"IGST ({inv.get('igst_rate')}%)", money_from_cents(igst_cents)))

    y_cursor = words_top - 6 * mm
    c.setStrokeColor(GREY_200)
    for label, val in totals_rows:
        c.setFillColor(GREY_50)
        c.rect(totals_x, y_cursor - row_h, totals_w, row_h, fill=1, stroke=1)
        c.setFillColor(NAVY)
        c.setFont(FONT_B, 8.5)
        c.drawString(totals_x + 3, y_cursor - row_h + 1.8 * mm, label)
        c.setFont(FONT_R, 9)
        c.drawRightString(totals_x + totals_w - 3, y_cursor - row_h + 1.8 * mm, val)
        y_cursor -= row_h

    # Grand total row (highlighted blue)
    c.setFillColor(BLUE)
    c.rect(totals_x, y_cursor - row_h - 1 * mm, totals_w, row_h + 1 * mm, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont(FONT_B, 10)
    c.drawString(totals_x + 3, y_cursor - row_h + 0.5 * mm, "TOTAL AMOUNT")
    c.setFont(FONT_B, 11)
    c.drawRightString(totals_x + totals_w - 3, y_cursor - row_h + 0.5 * mm, f"{currency_sym} {money_from_cents(total_cents)}")

    # --------- NOTES + PAYMENT DETAILS + SIGNATURE ------------------------
    section_top = min(y_cursor, words_top - aw_h) - 10 * mm

    # NOTES (left column)
    c.setFillColor(NAVY)
    c.setFont(FONT_B, 9)
    c.drawString(15 * mm, section_top, "NOTES")
    c.setStrokeColor(NAVY)
    c.setLineWidth(0.5)
    c.line(15 * mm, section_top - 1 * mm, 30 * mm, section_top - 1 * mm)

    notes = [
        "Payment is due within 15 days from the invoice date.",
        "Late payments may attract applicable charges.",
        "For any queries, contact our support team.",
    ]
    c.setFont(FONT_R, 8)
    c.setFillColor(GREY_500)
    for i, note in enumerate(notes):
        y = section_top - 5 * mm - i * 4.5 * mm
        c.setFillColor(BLUE)
        c.circle(17 * mm, y + 1.2, 0.8, fill=1, stroke=0)
        c.setFillColor(GREY_500)
        c.drawString(20 * mm, y, note)

    # PAYMENT DETAILS (middle)
    pay_x = 80 * mm
    c.setFillColor(NAVY)
    c.setFont(FONT_B, 9)
    c.drawString(pay_x, section_top, "PAYMENT DETAILS")
    c.line(pay_x, section_top - 1 * mm, pay_x + 30 * mm, section_top - 1 * mm)

    pay_rows = [
        ("Bank Name", COMPANY["bank_name"]),
        ("IFSC Code", COMPANY["bank_ifsc"]),
        ("Account No.", COMPANY["bank_account"]),
    ]
    c.setFont(FONT_R, 8)
    for i, (k, v) in enumerate(pay_rows):
        y = section_top - 5 * mm - i * 4.5 * mm
        c.setFillColor(NAVY)
        c.setFont(FONT_B, 8)
        c.drawString(pay_x, y, k)
        c.drawString(pay_x + 22 * mm, y, ":")
        c.setFont(FONT_R, 8)
        c.drawString(pay_x + 25 * mm, y, v)

    # SIGNATURE (right)
    sig_x = 145 * mm
    c.setFillColor(NAVY)
    c.setFont(FONT_B, 11)
    c.setFillColor(colors.HexColor("#1E40AF"))
    # Fake handwritten signature using italic-ish font
    c.setFont(FONT_B, 16)
    c.drawString(sig_x + 3, section_top - 7 * mm, COMPANY["authorized_signatory"].replace(" ", " "))
    # Underline
    c.setStrokeColor(NAVY)
    c.setLineWidth(0.5)
    c.line(sig_x, section_top - 10 * mm, sig_x + 45 * mm, section_top - 10 * mm)
    c.setFont(FONT_B, 9)
    c.setFillColor(NAVY)
    c.drawString(sig_x, section_top - 14 * mm, COMPANY["authorized_signatory"])
    c.setFont(FONT_R, 7.5)
    c.setFillColor(GREY_500)
    c.drawString(sig_x, section_top - 17.5 * mm, "Authorized Signatory")

    # --------- THANK YOU strip --------------------------------------------
    thanks_y = 30 * mm
    c.setFillColor(NAVY)
    c.setFont(FONT_B, 9)
    c.drawCentredString(PAGE_W / 2, thanks_y + 3 * mm,
                         "Thank you for choosing Insight Networks.")
    c.setFont(FONT_R, 8)
    c.setFillColor(GREY_500)
    c.drawCentredString(PAGE_W / 2, thanks_y,
                         "We look forward to powering your digital journey.")

    # Small decorative lines around thanks
    c.setStrokeColor(BLUE)
    c.setLineWidth(0.5)
    c.line(60 * mm, thanks_y + 1.5 * mm, 90 * mm, thanks_y + 1.5 * mm)
    c.circle(90 * mm, thanks_y + 1.5 * mm, 0.7, fill=1, stroke=0)
    c.line(120 * mm, thanks_y + 1.5 * mm, 150 * mm, thanks_y + 1.5 * mm)
    c.circle(120 * mm, thanks_y + 1.5 * mm, 0.7, fill=1, stroke=0)

    # --------- BOTTOM FOOTER BAND (blue) ----------------------------------
    FOOTER_H = 18 * mm
    c.setFillColor(NAVY)
    c.rect(0, 0, PAGE_W, FOOTER_H, fill=1, stroke=0)
    c.setFillColor(BLUE)
    c.rect(0, FOOTER_H, PAGE_W, 0.6 * mm, fill=1, stroke=0)

    # 4 columns of contact info
    cols = [
        ("\u260E", COMPANY["phone"]),
        ("\u2709", COMPANY["email"]),
        ("\u2318", COMPANY["web"]),
        ("\u2691", ", ".join(COMPANY["address_lines"])),
    ]
    col_w = PAGE_W / 4
    for i, (icon, text) in enumerate(cols):
        cx = i * col_w + 4 * mm
        c.setFillColor(BLUE)
        c.roundRect(cx, 5 * mm, 7 * mm, 7 * mm, 1 * mm, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont(FONT_B, 9)
        c.drawCentredString(cx + 3.5 * mm, 7 * mm, icon)
        c.setFont(FONT_R, 6.5)
        # Text may be too long — trim
        max_w = col_w - 15 * mm
        if stringWidth(text, FONT_R, 6.5) > max_w:
            # Try to break into 2 lines
            parts = text.split(", ")
            if len(parts) > 1:
                mid = len(parts) // 2
                l1 = ", ".join(parts[:mid])
                l2 = ", ".join(parts[mid:])
                c.drawString(cx + 12 * mm, 9 * mm, l1)
                c.drawString(cx + 12 * mm, 5.5 * mm, l2)
            else:
                c.drawString(cx + 12 * mm, 7 * mm, text)
        else:
            c.drawString(cx + 12 * mm, 7 * mm, text)

    c.showPage()
    c.save()
    return buf.getvalue()
