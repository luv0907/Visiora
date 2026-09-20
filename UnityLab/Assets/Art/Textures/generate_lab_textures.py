import math
import os
from PIL import Image, ImageDraw, ImageFont

TEXTURES_DIR = os.path.dirname(os.path.abspath(__file__))
os.makedirs(TEXTURES_DIR, exist_ok=True)

def get_font(size, bold=False):
    # Try standard system fonts on macOS
    font_paths = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNS.ttf",
        "/Library/Fonts/Arial.ttf"
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

# ─────────────────────────────────────────────────────────────────────────────
# 1. VOLTMETER DIAL (2048 x 2048)
# ─────────────────────────────────────────────────────────────────────────────
def generate_voltmeter_dial():
    size = 2048
    img = Image.new("RGBA", (size, size), (248, 247, 242, 255))
    draw = ImageDraw.Draw(img)

    cx, cy = size // 2, int(size * 0.78)
    radius = int(size * 0.58)

    # Dial border / outer bezel arc
    draw.arc([cx - radius - 40, cy - radius - 40, cx + radius + 40, cy + radius + 40],
             start=205, end=335, fill=(40, 40, 45, 255), width=8)

    # Anti-parallax mirror arc strip (silver/chrome reflection strip under needle)
    mirror_r1 = radius - 70
    mirror_r2 = radius - 110
    draw.arc([cx - mirror_r1, cy - mirror_r1, cx + mirror_r1, cy + mirror_r1],
             start=210, end=330, fill=(215, 218, 222, 255), width=35)
    draw.arc([cx - mirror_r1, cy - mirror_r1, cx + mirror_r1, cy + mirror_r1],
             start=210, end=330, fill=(175, 180, 188, 255), width=3)
    draw.arc([cx - mirror_r2, cy - mirror_r2, cx + mirror_r2, cy + mirror_r2],
             start=210, end=330, fill=(175, 180, 188, 255), width=3)

    # Main scale arc
    draw.arc([cx - radius, cy - radius, cx + radius, cy + radius],
             start=210, end=330, fill=(20, 20, 25, 255), width=6)

    # Voltage Scale: 0 to 5V (and 0 to 10V sub-scale)
    # 210 deg (left, 0V) to 330 deg (right, max V) -> 120 deg total span
    font_large = get_font(72, bold=True)
    font_title = get_font(110, bold=True)
    font_sub = get_font(42, bold=False)
    font_mc = get_font(34, bold=False)

    start_angle = 210.0
    end_angle = 330.0
    total_span = end_angle - start_angle

    # Major ticks (0, 1, 2, 3, 4, 5)
    for i in range(6):
        frac = i / 5.0
        deg = start_angle + frac * total_span
        rad = math.radians(deg)

        x1 = cx + radius * math.cos(rad)
        y1 = cy + radius * math.sin(rad)
        x2 = cx + (radius - 55) * math.cos(rad)
        y2 = cy + (radius - 55) * math.sin(rad)
        draw.line([x1, y1, x2, y2], fill=(20, 20, 25, 255), width=7)

        # Numbers
        x_num = cx + (radius - 120) * math.cos(rad)
        y_num = cy + (radius - 120) * math.sin(rad)
        num_str = str(i)
        bbox = draw.textbbox((0, 0), num_str, font=font_large)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((x_num - w / 2, y_num - h / 2), num_str, fill=(20, 20, 25, 255), font=font_large)

    # Medium and minor ticks
    for i in range(51):
        frac = i / 50.0
        deg = start_angle + frac * total_span
        rad = math.radians(deg)

        if i % 10 == 0:
            continue
        elif i % 5 == 0:
            tick_len = 35
            w = 4
        else:
            tick_len = 20
            w = 2

        x1 = cx + radius * math.cos(rad)
        y1 = cy + radius * math.sin(rad)
        x2 = cx + (radius - tick_len) * math.cos(rad)
        y2 = cy + (radius - tick_len) * math.sin(rad)
        draw.line([x1, y1, x2, y2], fill=(40, 40, 45, 255), width=w)

    # Large bold "V" in center
    v_text = "V"
    bbox = draw.textbbox((0, 0), v_text, font=font_title)
    draw.text((cx - (bbox[2] - bbox[0]) / 2, cy - 420), v_text, fill=(15, 20, 30, 255), font=font_title)

    # Subtitles
    t1 = "VOLTMETER"
    bbox = draw.textbbox((0, 0), t1, font=font_sub)
    draw.text((cx - (bbox[2] - bbox[0]) / 2, cy - 310), t1, fill=(50, 55, 65, 255), font=font_sub)

    t2 = "DIRECT CURRENT  •  CLASS 1.0  •  500Ω/V"
    bbox = draw.textbbox((0, 0), t2, font=font_mc)
    draw.text((cx - (bbox[2] - bbox[0]) / 2, cy - 250), t2, fill=(100, 105, 115, 255), font=font_mc)

    # Moving Coil Instrument symbol: horseshoe magnet + coil
    draw.rectangle([cx - 40, cy - 190, cx + 40, cy - 150], outline=(70, 75, 85, 255), width=4)
    draw.line([cx, cy - 190, cx, cy - 150], fill=(70, 75, 85, 255), width=3)

    # Zero adjustment screw representation at bottom
    draw.ellipse([cx - 50, cy - 70, cx + 50, cy + 30], fill=(220, 222, 225, 255), outline=(130, 135, 145, 255), width=4)
    draw.line([cx - 30, cy - 20, cx + 30, cy - 20], fill=(90, 95, 105, 255), width=6)

    # Polarity markers
    font_polar = get_font(60, bold=True)
    draw.text((cx - radius + 50, cy - 80), "—", fill=(20, 20, 25, 255), font=font_polar)
    draw.text((cx + radius - 90, cy - 80), "+", fill=(190, 25, 25, 255), font=font_polar)

    out_path = os.path.join(TEXTURES_DIR, "voltmeter_dial_2k.png")
    img.save(out_path, "PNG")
    print(f"Generated: {out_path}")

# ─────────────────────────────────────────────────────────────────────────────
# 2. AMMETER DIAL (2048 x 2048)
# ─────────────────────────────────────────────────────────────────────────────
def generate_ammeter_dial():
    size = 2048
    img = Image.new("RGBA", (size, size), (248, 247, 242, 255))
    draw = ImageDraw.Draw(img)

    cx, cy = size // 2, int(size * 0.78)
    radius = int(size * 0.58)

    # Outer bezel arc
    draw.arc([cx - radius - 40, cy - radius - 40, cx + radius + 40, cy + radius + 40],
             start=205, end=335, fill=(40, 40, 45, 255), width=8)

    # Mirror arc strip
    mirror_r1 = radius - 70
    mirror_r2 = radius - 110
    draw.arc([cx - mirror_r1, cy - mirror_r1, cx + mirror_r1, cy + mirror_r1],
             start=210, end=330, fill=(215, 218, 222, 255), width=35)
    draw.arc([cx - mirror_r1, cy - mirror_r1, cx + mirror_r1, cy + mirror_r1],
             start=210, end=330, fill=(175, 180, 188, 255), width=3)
    draw.arc([cx - mirror_r2, cy - mirror_r2, cx + mirror_r2, cy + mirror_r2],
             start=210, end=330, fill=(175, 180, 188, 255), width=3)

    # Main scale arc
    draw.arc([cx - radius, cy - radius, cx + radius, cy + radius],
             start=210, end=330, fill=(20, 20, 25, 255), width=6)

    font_large = get_font(68, bold=True)
    font_title = get_font(110, bold=True)
    font_sub = get_font(42, bold=False)
    font_mc = get_font(34, bold=False)

    start_angle = 210.0
    end_angle = 330.0
    total_span = end_angle - start_angle

    # Ammeter Scale: 0 to 1.0 A (0, 0.2, 0.4, 0.6, 0.8, 1.0)
    current_labels = ["0", "0.2", "0.4", "0.6", "0.8", "1.0"]
    for i in range(6):
        frac = i / 5.0
        deg = start_angle + frac * total_span
        rad = math.radians(deg)

        x1 = cx + radius * math.cos(rad)
        y1 = cy + radius * math.sin(rad)
        x2 = cx + (radius - 55) * math.cos(rad)
        y2 = cy + (radius - 55) * math.sin(rad)
        draw.line([x1, y1, x2, y2], fill=(20, 20, 25, 255), width=7)

        # Numbers
        x_num = cx + (radius - 120) * math.cos(rad)
        y_num = cy + (radius - 120) * math.sin(rad)
        num_str = current_labels[i]
        bbox = draw.textbbox((0, 0), num_str, font=font_large)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((x_num - w / 2, y_num - h / 2), num_str, fill=(20, 20, 25, 255), font=font_large)

    # Minor ticks (50 total divisions = 0.02 A per subdivision)
    for i in range(51):
        frac = i / 50.0
        deg = start_angle + frac * total_span
        rad = math.radians(deg)

        if i % 10 == 0:
            continue
        elif i % 5 == 0:
            tick_len = 35
            w = 4
        else:
            tick_len = 20
            w = 2

        x1 = cx + radius * math.cos(rad)
        y1 = cy + radius * math.sin(rad)
        x2 = cx + (radius - tick_len) * math.cos(rad)
        y2 = cy + (radius - tick_len) * math.sin(rad)
        draw.line([x1, y1, x2, y2], fill=(40, 40, 45, 255), width=w)

    # Large bold "A" in center
    a_text = "A"
    bbox = draw.textbbox((0, 0), a_text, font=font_title)
    draw.text((cx - (bbox[2] - bbox[0]) / 2, cy - 420), a_text, fill=(15, 20, 30, 255), font=font_title)

    # Subtitles
    t1 = "AMMETER"
    bbox = draw.textbbox((0, 0), t1, font=font_sub)
    draw.text((cx - (bbox[2] - bbox[0]) / 2, cy - 310), t1, fill=(50, 55, 65, 255), font=font_sub)

    t2 = "DIRECT CURRENT  •  CLASS 1.0  •  SHUNTED"
    bbox = draw.textbbox((0, 0), t2, font=font_mc)
    draw.text((cx - (bbox[2] - bbox[0]) / 2, cy - 250), t2, fill=(100, 105, 115, 255), font=font_mc)

    # Moving Coil symbol
    draw.rectangle([cx - 40, cy - 190, cx + 40, cy - 150], outline=(70, 75, 85, 255), width=4)
    draw.line([cx, cy - 190, cx, cy - 150], fill=(70, 75, 85, 255), width=3)

    # Zero adjuster screw
    draw.ellipse([cx - 50, cy - 70, cx + 50, cy + 30], fill=(220, 222, 225, 255), outline=(130, 135, 145, 255), width=4)
    draw.line([cx - 30, cy - 20, cx + 30, cy - 20], fill=(90, 95, 105, 255), width=6)

    # Polarity markers
    font_polar = get_font(60, bold=True)
    draw.text((cx - radius + 50, cy - 80), "—", fill=(20, 20, 25, 255), font=font_polar)
    draw.text((cx + radius - 90, cy - 80), "+", fill=(190, 25, 25, 255), font=font_polar)

    out_path = os.path.join(TEXTURES_DIR, "ammeter_dial_2k.png")
    img.save(out_path, "PNG")
    print(f"Generated: {out_path}")

# ─────────────────────────────────────────────────────────────────────────────
# 3. DC POWER SUPPLY FRONT PANEL (2048 x 1024)
# ─────────────────────────────────────────────────────────────────────────────
def generate_power_supply_panel():
    w, h = 2048, 1024
    img = Image.new("RGBA", (w, h), (38, 42, 48, 255))
    draw = ImageDraw.Draw(img)

    # Subtle brushed metal horizontal streaks
    for y in range(h):
        shade = 38 + int(8 * math.sin(y * 0.15) + 5 * math.cos(y * 0.05))
        draw.line([(0, y), (w, y)], fill=(shade, shade + 2, shade + 5, 255))

    # Outer border & screw holes
    draw.rectangle([10, 10, w - 10, h - 10], outline=(65, 70, 78, 255), width=4)
    screw_r = 16
    for sx, sy in [(40, 40), (w - 40, 40), (40, h - 40), (w - 40, h - 40)]:
        draw.ellipse([sx - screw_r, sy - screw_r, sx + screw_r, sy + screw_r], fill=(120, 125, 130, 255), outline=(20, 20, 25, 255), width=2)
        draw.line([sx - screw_r + 4, sy, sx + screw_r - 4, sy], fill=(40, 40, 45, 255), width=3)

    # Title & Badge
    font_brand = get_font(52, bold=True)
    font_model = get_font(32, bold=False)
    font_labels = get_font(38, bold=True)

    draw.text((70, 60), "VISORA  LABORATORY  SYSTEMS", fill=(210, 215, 225, 255), font=font_brand)
    draw.text((70, 125), "REGULATED DC POWER SUPPLY  •  MODEL PS-12A", fill=(140, 150, 165, 255), font=font_model)

    # Voltage Dial Center
    knob_cx, knob_cy = int(w * 0.5), int(h * 0.58)
    dial_r = 230

    draw.arc([knob_cx - dial_r, knob_cy - dial_r, knob_cx + dial_r, knob_cy + dial_r],
             start=140, end=400, fill=(180, 185, 195, 255), width=4)

    # Voltage steps: OFF, 2V, 4V, 6V, 8V, 10V, 12V
    voltages = ["OFF", "2V", "4V", "6V", "8V", "10V", "12V"]
    step_start = 140.0
    step_span = 260.0

    for i, vtext in enumerate(voltages):
        ang = step_start + (i / (len(voltages) - 1)) * step_span
        rad = math.radians(ang)
        x1 = knob_cx + (dial_r - 20) * math.cos(rad)
        y1 = knob_cy + (dial_r - 20) * math.sin(rad)
        x2 = knob_cx + (dial_r + 15) * math.cos(rad)
        y2 = knob_cy + (dial_r + 15) * math.sin(rad)
        draw.line([x1, y1, x2, y2], fill=(220, 225, 235, 255), width=5)

        tx = knob_cx + (dial_r + 65) * math.cos(rad)
        ty = knob_cy + (dial_r + 65) * math.sin(rad)
        bbox = draw.textbbox((0, 0), vtext, font=font_labels)
        draw.text((tx - (bbox[2] - bbox[0]) / 2, ty - (bbox[3] - bbox[1]) / 2), vtext, fill=(230, 235, 245, 255), font=font_labels)

    # Power switch area on the left
    sw_cx, sw_cy = 280, int(h * 0.6)
    draw.rectangle([sw_cx - 65, sw_cy - 95, sw_cx + 65, sw_cy + 95], fill=(20, 22, 26, 255), outline=(80, 85, 95, 255), width=4)
    # Red rocker
    draw.rectangle([sw_cx - 50, sw_cy - 80, sw_cx + 50, sw_cy + 80], fill=(210, 35, 35, 255), outline=(140, 20, 20, 255), width=3)
    draw.text((sw_cx - 24, sw_cy - 145), "POWER", fill=(200, 205, 215, 255), font=font_labels)
    # Status LED
    draw.ellipse([sw_cx - 20, sw_cy - 200, sw_cx + 20, sw_cy - 160], fill=(255, 60, 60, 255), outline=(120, 20, 20, 255), width=3)

    # Output terminals area on the right
    term_cx = w - 340
    draw.text((term_cx - 130, sw_cy - 180), "DC OUTPUT (MAX 2A)", fill=(200, 205, 215, 255), font=font_labels)
    # Positive terminal (Red)
    draw.ellipse([term_cx - 120, sw_cy - 50, term_cx - 40, sw_cy + 30], fill=(210, 35, 35, 255), outline=(255, 80, 80, 255), width=4)
    draw.text((term_cx - 92, sw_cy + 45), "+", fill=(230, 70, 70, 255), font=font_labels)
    # Negative terminal (Black)
    draw.ellipse([term_cx + 40, sw_cy - 50, term_cx + 120, sw_cy + 30], fill=(25, 25, 30, 255), outline=(90, 95, 105, 255), width=4)
    draw.text((term_cx + 72, sw_cy + 45), "—", fill=(200, 205, 215, 255), font=font_labels)

    out_path = os.path.join(TEXTURES_DIR, "power_supply_panel_2k.png")
    img.save(out_path, "PNG")
    print(f"Generated: {out_path}")

# ─────────────────────────────────────────────────────────────────────────────
# 4. CHALKBOARD WITH CIRCUIT SCHEMATIC (2048 x 1024)
# ─────────────────────────────────────────────────────────────────────────────
def generate_chalkboard():
    w, h = 2048, 1024
    # Deep blackboard slate green with subtle chalk dust
    img = Image.new("RGBA", (w, h), (26, 38, 32, 255))
    draw = ImageDraw.Draw(img)

    # Slate texture variation
    for y in range(0, h, 2):
        shade = int(5 * math.sin(y * 0.08) + 3 * math.cos(y * 0.15))
        draw.line([(0, y), (w, y)], fill=(26 + shade, 38 + shade, 32 + shade, 255))

    # Wooden frame
    frame_w = 32
    draw.rectangle([0, 0, w, frame_w], fill=(120, 80, 48, 255))
    draw.rectangle([0, h - frame_w, w, h], fill=(120, 80, 48, 255))
    draw.rectangle([0, 0, frame_w, h], fill=(120, 80, 48, 255))
    draw.rectangle([w - frame_w, 0, w, h], fill=(120, 80, 48, 255))
    draw.rectangle([frame_w, frame_w, w - frame_w, h - frame_w], outline=(15, 22, 18, 255), width=4)

    font_h1 = get_font(68, bold=True)
    font_h2 = get_font(46, bold=True)
    font_body = get_font(34, bold=False)
    font_chalk_math = get_font(52, bold=True)

    chalk_white = (240, 245, 242, 235)
    chalk_yellow = (255, 240, 160, 235)
    chalk_cyan = (175, 235, 245, 235)

    # Title
    t = "EXPERIMENT: VERIFICATION OF OHM'S LAW (V = I · R)"
    draw.text((70, 60), t, fill=chalk_yellow, font=font_h1)
    draw.line([(70, 140), (1950, 140)], fill=chalk_yellow, width=3)

    # Section 1: Theory & Statement
    draw.text((70, 165), "1. STATEMENT OF OHM'S LAW:", fill=chalk_cyan, font=font_h2)
    s1 = "At constant physical temperature and conditions, the electric current (I)"
    s2 = "flowing through an ohmic metallic conductor is directly proportional"
    s3 = "to the potential difference (V) applied across its terminals."
    draw.text((90, 225), s1, fill=chalk_white, font=font_body)
    draw.text((90, 265), s2, fill=chalk_white, font=font_body)
    draw.text((90, 305), s3, fill=chalk_white, font=font_body)

    # Equations Box
    draw.rectangle([80, 365, 800, 525], outline=chalk_white, width=3)
    draw.text((110, 385), "V  ∝  I    (T = constant)", fill=chalk_yellow, font=font_chalk_math)
    draw.text((110, 450), "V = I · R    ⇒    R = V / I", fill=chalk_white, font=font_chalk_math)

    # Section 2: Electrical Power
    draw.text((70, 560), "2. ELECTRICAL POWER DISSIPATED:", fill=chalk_cyan, font=font_h2)
    draw.text((90, 620), "P = V · I  =  I² · R  =  V² / R", fill=chalk_yellow, font=font_chalk_math)
    draw.text((90, 690), "Unit of Resistance: Ohm (Ω)  |  Current: Ampere (A)", fill=chalk_white, font=font_body)
    draw.text((90, 735), "Potential Difference: Volt (V)  |  Power: Watt (W)", fill=chalk_white, font=font_body)

    # Section 3: Circuit Schematic Diagram (Hand-drawn style)
    draw.text((920, 165), "3. CIRCUIT DIAGRAM:", fill=chalk_cyan, font=font_h2)

    cx1, cy1 = 980, 400
    # Battery symbol
    draw.line([cx1, cy1, cx1 + 60, cy1], fill=chalk_white, width=4)
    draw.line([cx1 + 60, cy1 - 40, cx1 + 60, cy1 + 40], fill=chalk_white, width=6)
    draw.line([cx1 + 80, cy1 - 20, cx1 + 80, cy1 + 20], fill=chalk_white, width=8)
    draw.line([cx1 + 80, cy1, cx1 + 140, cy1], fill=chalk_white, width=4)
    draw.text((cx1 + 40, cy1 - 70), "+  Battery  —", fill=chalk_white, font=font_body)

    # Key switch
    draw.line([cx1 + 140, cy1, cx1 + 220, cy1], fill=chalk_white, width=4)
    draw.arc([cx1 + 220, cy1 - 20, cx1 + 260, cy1 + 20], start=0, end=360, fill=chalk_white, width=3)
    draw.arc([cx1 + 290, cy1 - 20, cx1 + 330, cy1 + 20], start=0, end=360, fill=chalk_white, width=3)
    draw.line([cx1 + 260, cy1 - 10, cx1 + 295, cy1 - 25], fill=chalk_white, width=4) # open plug
    draw.text((cx1 + 230, cy1 - 65), "Plug Key (K)", fill=chalk_white, font=font_body)

    # Rheostat
    draw.line([cx1 + 330, cy1, cx1 + 420, cy1], fill=chalk_white, width=4)
    # Zigzag for rheostat
    rx = cx1 + 420
    for j in range(6):
        draw.line([rx + j * 16, cy1, rx + j * 16 + 8, cy1 - 18 if j%2==0 else cy1 + 18], fill=chalk_white, width=4)
    # Arrow for slider
    draw.line([rx + 48, cy1 - 55, rx + 48, cy1 - 12], fill=chalk_white, width=4)
    draw.line([rx + 40, cy1 - 25, rx + 48, cy1 - 12], fill=chalk_white, width=4)
    draw.line([rx + 56, cy1 - 25, rx + 48, cy1 - 12], fill=chalk_white, width=4)
    draw.text((rx, cy1 - 85), "Rheostat (Rh)", fill=chalk_white, font=font_body)

    # Ammeter
    draw.line([rx + 96, cy1, rx + 160, cy1], fill=chalk_white, width=4)
    draw.ellipse([rx + 160, cy1 - 35, rx + 230, cy1 + 35], outline=chalk_white, width=4)
    draw.text((rx + 182, cy1 - 22), "A", fill=chalk_yellow, font=font_h2)
    draw.text((rx + 160, cy1 - 70), "Ammeter (+/-)", fill=chalk_white, font=font_body)

    # Resistor
    draw.line([rx + 230, cy1, rx + 300, cy1], fill=chalk_white, width=4)
    rx2 = rx + 300
    for j in range(5):
        draw.line([rx2 + j * 18, cy1, rx2 + j * 18 + 9, cy1 - 18 if j%2==0 else cy1 + 18], fill=chalk_white, width=4)
    draw.text((rx2 + 10, cy1 - 65), "Resistor (R)", fill=chalk_yellow, font=font_h2)

    # Return wire
    draw.line([rx2 + 90, cy1, rx2 + 140, cy1], fill=chalk_white, width=4)
    draw.line([rx2 + 140, cy1, rx2 + 140, cy1 + 160], fill=chalk_white, width=4)
    draw.line([rx2 + 140, cy1 + 160, cx1, cy1 + 160], fill=chalk_white, width=4)
    draw.line([cx1, cy1 + 160, cx1, cy1], fill=chalk_white, width=4)

    # Voltmeter in parallel across resistor
    draw.line([rx2 - 10, cy1, rx2 - 10, cy1 - 100], fill=chalk_cyan, width=4)
    draw.line([rx2 - 10, cy1 - 100, rx2 + 35, cy1 - 100], fill=chalk_cyan, width=4)
    draw.ellipse([rx2 + 35, cy1 - 135, rx2 + 105, cy1 - 65], outline=chalk_cyan, width=4)
    draw.text((rx2 + 56, cy1 - 122), "V", fill=chalk_yellow, font=font_h2)
    draw.line([rx2 + 105, cy1 - 100, rx2 + 150, cy1 - 100], fill=chalk_cyan, width=4)
    draw.line([rx2 + 150, cy1 - 100, rx2 + 150, cy1], fill=chalk_cyan, width=4)
    draw.text((rx2 + 30, cy1 - 170), "Voltmeter (Parallel)", fill=chalk_cyan, font=font_body)

    # Section 4: V-I Graph Preview
    draw.text((920, 610), "4. EXPECTED V-I CHARACTERISTIC (SLOPE = R):", fill=chalk_cyan, font=font_h2)
    gx, gy = 980, 880
    draw.line([gx, gy, gx + 350, gy], fill=chalk_white, width=4) # X axis: Current I (A)
    draw.line([gx, gy, gx, gy - 200], fill=chalk_white, width=4) # Y axis: Voltage V (V)
    draw.text((gx + 260, gy + 15), "Current I (A) →", fill=chalk_white, font=font_body)
    draw.text((gx - 35, gy - 240), "↑ Voltage V (V)", fill=chalk_white, font=font_body)
    # Straight line through origin
    draw.line([gx, gy, gx + 300, gy - 180], fill=chalk_yellow, width=5)
    draw.text((gx + 120, gy - 135), "Slope = ΔV/ΔI = R", fill=chalk_yellow, font=font_body)

    out_path = os.path.join(TEXTURES_DIR, "chalkboard_ohms_law_2k.png")
    img.save(out_path, "PNG")
    print(f"Generated: {out_path}")

# ─────────────────────────────────────────────────────────────────────────────
# 5. LAB BENCH POLISHED EPOXY (1024 x 1024)
# ─────────────────────────────────────────────────────────────────────────────
def generate_bench_epoxy():
    size = 1024
    img = Image.new("RGBA", (size, size), (18, 20, 23, 255))
    draw = ImageDraw.Draw(img)

    for y in range(size):
        variation = int(2 * math.sin(y * 0.2) + 2 * math.cos(y * 0.05))
        draw.line([(0, y), (size, y)], fill=(18 + variation, 20 + variation, 23 + variation, 255))

    out_path = os.path.join(TEXTURES_DIR, "lab_bench_epoxy_2k.png")
    img.save(out_path, "PNG")
    print(f"Generated: {out_path}")

# ─────────────────────────────────────────────────────────────────────────────
# 6. LAB FLOOR TILES (1024 x 1024)
# ─────────────────────────────────────────────────────────────────────────────
def generate_floor_tiles():
    size = 1024
    img = Image.new("RGBA", (size, size), (42, 45, 50, 255))
    draw = ImageDraw.Draw(img)

    tile_size = 256
    grout_color = (25, 27, 30, 255)

    for i in range(0, size, tile_size):
        draw.line([(0, i), (size, i)], fill=grout_color, width=4)
        draw.line([(i, 0), (i, size)], fill=grout_color, width=4)

    out_path = os.path.join(TEXTURES_DIR, "lab_floor_tiles_2k.png")
    img.save(out_path, "PNG")
    print(f"Generated: {out_path}")

# ─────────────────────────────────────────────────────────────────────────────
# 7. RHEOSTAT WIRE (1024 x 512)
# ─────────────────────────────────────────────────────────────────────────────
def generate_rheostat_wire():
    w, h = 1024, 512
    img = Image.new("RGBA", (w, h), (230, 228, 222, 255)) # Porcelain core base
    draw = ImageDraw.Draw(img)

    # Tightly wound resistance wire coils (dark oxidized metallic wire)
    pitch = 8
    for x in range(0, w, pitch):
        draw.line([(x, 0), (x, h)], fill=(75, 68, 62, 255), width=4)
        draw.line([(x + 2, 0), (x + 2, h)], fill=(130, 120, 110, 255), width=2) # specular wire edge
        draw.line([(x + 4, 0), (x + 4, h)], fill=(35, 30, 28, 255), width=2)  # shadow between turns

    out_path = os.path.join(TEXTURES_DIR, "rheostat_wire_2k.png")
    img.save(out_path, "PNG")
    print(f"Generated: {out_path}")

if __name__ == "__main__":
    print("Generating photorealistic 2K lab textures...")
    generate_voltmeter_dial()
    generate_ammeter_dial()
    generate_power_supply_panel()
    generate_chalkboard()
    generate_bench_epoxy()
    generate_floor_tiles()
    generate_rheostat_wire()
    print("All textures successfully created!")
