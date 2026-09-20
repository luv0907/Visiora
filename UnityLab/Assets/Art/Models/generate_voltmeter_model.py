import math
import os
import numpy as np

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Equipment")
os.makedirs(OUTPUT_DIR, exist_ok=True)

class ObjWriter:
    def __init__(self, filename, mtl_filename=None):
        self.filepath = os.path.join(OUTPUT_DIR, filename)
        self.vertices = []
        self.normals = []
        self.uvs = []
        self.faces = [] # (v_indices, vt_indices, vn_indices, material_name)
        self.current_material = "Default"
        self.mtl_filename = mtl_filename

    def set_material(self, mat_name):
        self.current_material = mat_name

    def add_vertex(self, x, y, z):
        self.vertices.append((float(x), float(y), float(z)))
        return len(self.vertices)

    def add_uv(self, u, v):
        self.uvs.append((float(u), float(v)))
        return len(self.uvs)

    def add_normal(self, nx, ny, nz):
        l = math.sqrt(nx*nx + ny*ny + nz*nz)
        if l > 1e-6:
            nx, ny, nz = nx/l, ny/l, nz/l
        else:
            nx, ny, nz = 0, 1, 0
        self.normals.append((float(nx), float(ny), float(nz)))
        return len(self.normals)

    def add_quad(self, v1, v2, v3, v4, uv1=None, uv2=None, uv3=None, uv4=None, n=None):
        if n is None:
            # compute normal from cross product
            p1 = np.array(self.vertices[v1-1])
            p2 = np.array(self.vertices[v2-1])
            p3 = np.array(self.vertices[v3-1])
            norm = np.cross(p2 - p1, p3 - p1)
            nl = np.linalg.norm(norm)
            if nl > 1e-6: norm = norm / nl
            else: norm = np.array([0, 1, 0])
            n1 = n2 = n3 = n4 = self.add_normal(norm[0], norm[1], norm[2])
        elif isinstance(n, int):
            n1 = n2 = n3 = n4 = n
        else:
            n1, n2, n3, n4 = n

        # Add two triangles (1, 2, 3) and (1, 3, 4)
        self.faces.append(([v1, v2, v3], [uv1, uv2, uv3] if uv1 else None, [n1, n2, n3], self.current_material))
        self.faces.append(([v1, v3, v4], [uv1, uv3, uv4] if uv1 else None, [n1, n3, n4], self.current_material))

    def add_triangle(self, v1, v2, v3, uv1=None, uv2=None, uv3=None, n1=None, n2=None, n3=None):
        if n1 is None:
            p1 = np.array(self.vertices[v1-1])
            p2 = np.array(self.vertices[v2-1])
            p3 = np.array(self.vertices[v3-1])
            norm = np.cross(p2 - p1, p3 - p1)
            nl = np.linalg.norm(norm)
            if nl > 1e-6: norm = norm / nl
            else: norm = np.array([0, 1, 0])
            n1 = n2 = n3 = self.add_normal(norm[0], norm[1], norm[2])
        self.faces.append(([v1, v2, v3], [uv1, uv2, uv3] if uv1 else None, [n1, n2, n3], self.current_material))

    def add_cylinder(self, center_bottom, radius, height, segments=16, capped_top=True, capped_bottom=True):
        cb = np.array(center_bottom)
        bot_ring = []
        top_ring = []
        bot_uvs = []
        top_uvs = []

        for i in range(segments):
            angle = 2.0 * math.pi * i / segments
            cos_a, sin_a = math.cos(angle), math.sin(angle)
            vx = cb[0] + radius * cos_a
            vy_b = cb[1]
            vy_t = cb[1] + height
            vz = cb[2] + radius * sin_a

            v_b = self.add_vertex(vx, vy_b, vz)
            v_t = self.add_vertex(vx, vy_t, vz)
            u = i / float(segments)
            uv_b = self.add_uv(u, 0.0)
            uv_t = self.add_uv(u, 1.0)
            bot_ring.append(v_b)
            top_ring.append(v_t)
            bot_uvs.append(uv_b)
            top_uvs.append(uv_t)

        # Side quads with smooth cylinder normals
        for i in range(segments):
            next_i = (i + 1) % segments
            ang1 = 2.0 * math.pi * i / segments
            ang2 = 2.0 * math.pi * next_i / segments
            n1 = self.add_normal(math.cos(ang1), 0, math.sin(ang1))
            n2 = self.add_normal(math.cos(ang2), 0, math.sin(ang2))
            # v_b(i), v_b(next), v_t(next), v_t(i)
            self.faces.append((
                [bot_ring[i], bot_ring[next_i], top_ring[next_i]],
                [bot_uvs[i], bot_uvs[next_i], top_uvs[next_i]],
                [n1, n2, n2],
                self.current_material
            ))
            self.faces.append((
                [bot_ring[i], top_ring[next_i], top_ring[i]],
                [bot_uvs[i], top_uvs[next_i], top_uvs[i]],
                [n1, n2, n1],
                self.current_material
            ))

        # Top cap
        if capped_top:
            v_tc = self.add_vertex(cb[0], cb[1] + height, cb[2])
            uv_tc = self.add_uv(0.5, 0.5)
            n_top = self.add_normal(0, 1, 0)
            for i in range(segments):
                next_i = (i + 1) % segments
                self.add_triangle(v_tc, top_ring[i], top_ring[next_i],
                                  uv_tc, top_uvs[i], top_uvs[next_i],
                                  n_top, n_top, n_top)

        # Bottom cap
        if capped_bottom:
            v_bc = self.add_vertex(cb[0], cb[1], cb[2])
            uv_bc = self.add_uv(0.5, 0.5)
            n_bot = self.add_normal(0, -1, 0)
            for i in range(segments):
                next_i = (i + 1) % segments
                self.add_triangle(v_bc, bot_ring[next_i], bot_ring[i],
                                  uv_bc, bot_uvs[next_i], bot_uvs[i],
                                  n_bot, n_bot, n_bot)

    def write(self):
        with open(self.filepath, "w") as f:
            f.write("# Wavefront OBJ exported by Visora 3D Designer\n")
            if self.mtl_filename:
                f.write(f"mtllib {self.mtl_filename}\n")

            for v in self.vertices:
                f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
            for vt in self.uvs:
                f.write(f"vt {vt[0]:.6f} {vt[1]:.6f}\n")
            for vn in self.normals:
                f.write(f"vn {vn[0]:.6f} {vn[1]:.6f} {vn[2]:.6f}\n")

            current_mat = None
            for face_v, face_vt, face_vn, mat in self.faces:
                if mat != current_mat:
                    f.write(f"usemtl {mat}\n")
                    current_mat = mat
                
                parts = []
                for i in range(len(face_v)):
                    v_idx = face_v[i]
                    vt_idx = face_vt[i] if face_vt and face_vt[i] else ""
                    vn_idx = face_vn[i] if face_vn and face_vn[i] else ""
                    if vt_idx != "" and vn_idx != "":
                        parts.append(f"{v_idx}/{vt_idx}/{vn_idx}")
                    elif vn_idx != "":
                        parts.append(f"{v_idx}//{vn_idx}")
                    elif vt_idx != "":
                        parts.append(f"{v_idx}/{vt_idx}")
                    else:
                        parts.append(f"{v_idx}")
                f.write("f " + " ".join(parts) + "\n")
        print(f"✓ Saved {self.filepath} ({len(self.vertices)} verts, {len(self.faces)} faces)")


def generate_mtl():
    mtl_path = os.path.join(OUTPUT_DIR, "Voltmeter_Lab_Pro.mtl")
    with open(mtl_path, "w") as f:
        f.write("""# Visora Laboratory Materials Definition
newmtl M_Bakelite
Kd 0.12 0.13 0.15
Ks 0.25 0.25 0.28
Ns 35.0
d 1.0

newmtl M_Bezel
Kd 0.08 0.08 0.09
Ks 0.40 0.40 0.40
Ns 60.0
d 1.0

newmtl M_DialPlate
Kd 0.96 0.95 0.91
Ks 0.10 0.10 0.10
Ns 10.0
d 1.0
map_Kd ../Textures/voltmeter_dial_2k.png

newmtl M_MirrorStrip
Kd 0.85 0.88 0.92
Ks 0.95 0.95 0.98
Ns 120.0
d 1.0

newmtl M_Glass
Kd 0.90 0.95 1.00
Ks 0.90 0.90 0.95
Ns 90.0
d 0.25

newmtl M_Brass
Kd 0.85 0.68 0.22
Ks 0.92 0.82 0.45
Ns 75.0
d 1.0

newmtl M_TerminalRed
Kd 0.85 0.14 0.12
Ks 0.35 0.35 0.35
Ns 40.0
d 1.0

newmtl M_TerminalBlack
Kd 0.09 0.09 0.10
Ks 0.30 0.30 0.30
Ns 40.0
d 1.0

newmtl M_NeedleRed
Kd 0.92 0.12 0.10
Ks 0.40 0.40 0.40
Ns 50.0
d 1.0

newmtl M_NeedleHub
Kd 0.20 0.20 0.22
Ks 0.80 0.80 0.85
Ns 80.0
d 1.0
""")
    print(f"✓ Saved {mtl_path}")


def generate_voltmeter_chassis():
    obj = ObjWriter("Voltmeter_Lab_Pro.obj", "Voltmeter_Lab_Pro.mtl")

    # Dimensions (meters)
    # W = 0.14m (14cm wide)
    # D = 0.12m (12cm deep)
    # H_back = 0.082m (8.2cm rear height)
    # H_front = 0.024m (2.4cm front lip)
    w = 0.070 # half width = 7cm
    df = -0.060 # front Z = -6cm
    db = 0.060  # back Z = +6cm
    hf = 0.024 # front lip
    hb = 0.082 # rear top
    c = 0.005  # corner bevel radius

    # ── 1. MAIN HOUSING (M_Bakelite) ──────────────────────────────────────────
    obj.set_material("M_Bakelite")

    # Bottom base plate vertices (with 4 rounded corners)
    # We will construct a clean beveled box for the main body
    # Base: Y=0
    # Left, Right, Front, Back, Bottom faces
    v_bfl = obj.add_vertex(-w, 0, df)
    v_bfr = obj.add_vertex( w, 0, df)
    v_bbr = obj.add_vertex( w, 0, db)
    v_bbl = obj.add_vertex(-w, 0, db)

    # Top boundary vertices
    v_tfl = obj.add_vertex(-w, hf, df)
    v_tfr = obj.add_vertex( w, hf, df)
    v_tbr = obj.add_vertex( w, hb, db)
    v_tbl = obj.add_vertex(-w, hb, db)

    # Bottom face
    obj.add_quad(v_bfl, v_bbl, v_bbr, v_bfr, n=obj.add_normal(0, -1, 0))
    # Front vertical wall
    obj.add_quad(v_bfl, v_bfr, v_tfr, v_tfl, n=obj.add_normal(0, 0, -1))
    # Back vertical wall
    obj.add_quad(v_bbl, v_tbl, v_tbr, v_bbr, n=obj.add_normal(0, 0, 1))
    # Left side wall (trapezoid)
    obj.add_quad(v_bbl, v_bfl, v_tfl, v_tbl, n=obj.add_normal(-1, 0, 0))
    # Right side wall (trapezoid)
    obj.add_quad(v_bfr, v_bbr, v_tbr, v_tfr, n=obj.add_normal(1, 0, 0))

    # Top Inclined Face with Recessed Window:
    # Dial window margins:
    mw = 0.054  # half width of window (10.8cm wide)
    # Along the incline from front to back:
    # Front ledge (for terminals): z from df (-0.060) to z1 (-0.038)
    z1 = -0.038
    y1 = hf + (hb - hf) * (z1 - df) / (db - df) # y at ledge transition
    # Window top edge: z2 (+0.048)
    z2 = 0.048
    y2 = hf + (hb - hf) * (z2 - df) / (db - df)

    v_lfl = obj.add_vertex(-w, y1, z1)
    v_lfr = obj.add_vertex( w, y1, z1)
    v_lbl = obj.add_vertex(-w, y2, z2)
    v_lbr = obj.add_vertex( w, y2, z2)

    # Incline face normal:
    inc_n = np.cross(np.array([2*w, 0, 0]), np.array([0, hb - hf, db - df]))
    inc_n = inc_n / np.linalg.norm(inc_n)
    n_inc = obj.add_normal(inc_n[0], inc_n[1], inc_n[2])

    # 1. Lower Terminal Ledge quad (from tfl/tfr to lfl/lfr)
    obj.add_quad(v_tfl, v_tfr, v_lfr, v_lfl, n=n_inc)
    # 2. Top rear margin quad (from lbl/lbr to tbl/tbr)
    obj.add_quad(v_lbl, v_lbr, v_tbr, v_tbl, n=n_inc)

    # Window cutout vertices on the top surface:
    v_wfl = obj.add_vertex(-mw, y1, z1)
    v_wfr = obj.add_vertex( mw, y1, z1)
    v_wbl = obj.add_vertex(-mw, y2, z2)
    v_wbr = obj.add_vertex( mw, y2, z2)

    # Left border of window
    obj.add_quad(v_lfl, v_wfl, v_wbl, v_lbl, n=n_inc)
    # Right border of window
    obj.add_quad(v_wfr, v_lfr, v_lbr, v_wbr, n=n_inc)

    # ── 2. RECESSED DIAL HOUSING & BEZEL (M_Bezel) ───────────────────────────
    obj.set_material("M_Bezel")
    recess_depth = 0.008 # 8mm depth into casing
    down_offset = inc_n * (-recess_depth)

    p_wfl_rec = np.array([-mw, y1, z1]) + down_offset
    p_wfr_rec = np.array([ mw, y1, z1]) + down_offset
    p_wbl_rec = np.array([-mw, y2, z2]) + down_offset
    p_wbr_rec = np.array([ mw, y2, z2]) + down_offset

    v_rfl = obj.add_vertex(p_wfl_rec[0], p_wfl_rec[1], p_wfl_rec[2])
    v_rfr = obj.add_vertex(p_wfr_rec[0], p_wfr_rec[1], p_wfr_rec[2])
    v_rbl = obj.add_vertex(p_wbl_rec[0], p_wbl_rec[1], p_wbl_rec[2])
    v_rbr = obj.add_vertex(p_wbr_rec[0], p_wbr_rec[1], p_wbr_rec[2])

    # 4 Bevel walls of the recess:
    obj.add_quad(v_wfl, v_wfr, v_rfr, v_rfl) # front recess wall
    obj.add_quad(v_wbl, v_rbl, v_rbr, v_wbr) # back recess wall
    obj.add_quad(v_wfl, v_rfl, v_rbl, v_wbl) # left recess wall
    obj.add_quad(v_wfr, v_wbr, v_rbr, v_rfr) # right recess wall

    # ── 3. CALIBRATED DIAL PLATE (M_DialPlate) ────────────────────────────────
    obj.set_material("M_DialPlate")
    # Slightly raised from recess floor (0.5mm)
    dial_offset = down_offset + inc_n * 0.0006
    p_dfl = np.array([-mw, y1, z1]) + dial_offset
    p_dfr = np.array([ mw, y1, z1]) + dial_offset
    p_dbl = np.array([-mw, y2, z2]) + dial_offset
    p_dbr = np.array([ mw, y2, z2]) + dial_offset

    vd1 = obj.add_vertex(p_dfl[0], p_dfl[1], p_dfl[2])
    vd2 = obj.add_vertex(p_dfr[0], p_dfr[1], p_dfr[2])
    vd3 = obj.add_vertex(p_dbr[0], p_dbr[1], p_dbr[2])
    vd4 = obj.add_vertex(p_dbl[0], p_dbl[1], p_dbl[2])

    uv1 = obj.add_uv(0.0, 0.0)
    uv2 = obj.add_uv(1.0, 0.0)
    uv3 = obj.add_uv(1.0, 1.0)
    uv4 = obj.add_uv(0.0, 1.0)

    obj.add_quad(vd1, vd2, vd3, vd4, uv1, uv2, uv3, uv4, n=n_inc)

    # ── 4. GLASS WINDOW COVER (M_Glass) ───────────────────────────────────────
    obj.set_material("M_Glass")
    # Sits 1mm below top rim
    glass_offset = inc_n * (-0.001)
    p_gfl = np.array([-mw, y1, z1]) + glass_offset
    p_gfr = np.array([ mw, y1, z1]) + glass_offset
    p_gbl = np.array([-mw, y2, z2]) + glass_offset
    p_gbr = np.array([ mw, y2, z2]) + glass_offset

    vg1 = obj.add_vertex(p_gfl[0], p_gfl[1], p_gfl[2])
    vg2 = obj.add_vertex(p_gfr[0], p_gfr[1], p_gfr[2])
    vg3 = obj.add_vertex(p_gbr[0], p_gbr[1], p_gbr[2])
    vg4 = obj.add_vertex(p_gbl[0], p_gbl[1], p_gbl[2])
    obj.add_quad(vg1, vg2, vg3, vg4, uv1, uv2, uv3, uv4, n=n_inc)

    # ── 5. MECHANICAL ZERO ADJUSTER SCREW (M_Brass) ───────────────────────────
    obj.set_material("M_Brass")
    # Positioned at bottom center of dial recess
    p_zero_base = (p_dfl + p_dfr) * 0.5 + (p_dbl - p_dfl) * 0.12
    # Small circular slotted screw (radius 3.5mm, height 1.8mm)
    obj.add_cylinder(p_zero_base, 0.0035, 0.0018, segments=12)

    # ── 6. STOP PINS (M_Brass) ────────────────────────────────────────────────
    # Stop pin at zero (approx 20 degrees left of vertical) and full scale (20 deg right)
    needle_pivot = (p_dfl + p_dfr) * 0.5 + (p_dbl - p_dfl) * 0.22
    span_vec = (p_dfr - p_dfl)
    up_vec = (p_dbl - p_dfl)

    # Left pin (zero stop)
    pin_left_pos = needle_pivot - span_vec * 0.38 + up_vec * 0.55
    obj.add_cylinder(pin_left_pos, 0.0008, 0.005, segments=8)

    # Right pin (full scale stop)
    pin_right_pos = needle_pivot + span_vec * 0.38 + up_vec * 0.55
    obj.add_cylinder(pin_right_pos, 0.0008, 0.005, segments=8)

    # ── 7. THREE BINDING POST TERMINALS ───────────────────────────────────────
    # Terminal 1: Common (-) [Black] at x = -0.045
    # Terminal 2: +3V Range [Red] at x = 0.0
    # Terminal 3: +15V Range [Red] at x = +0.045
    term_z = (df + z1) * 0.5 # along the front lower ledge
    term_y = hf + (hb - hf) * (term_z - df) / (db - df)

    term_positions = [
        (-0.042, term_y, term_z, "M_TerminalBlack", "-"),
        ( 0.000, term_y, term_z, "M_TerminalRed", "+3V"),
        ( 0.042, term_y, term_z, "M_TerminalRed", "+15V")
    ]

    for tx, ty, tz, cap_mat, lbl in term_positions:
        base_pt = [tx, ty, tz]
        # Brass hexagonal base & threaded stud
        obj.set_material("M_Brass")
        obj.add_cylinder(base_pt, 0.0055, 0.004, segments=8) # Hex-like base
        stud_pt = [tx, ty + 0.004, tz]
        obj.add_cylinder(stud_pt, 0.0028, 0.010, segments=12) # Brass threaded stud

        # Molded knurled plastic cap
        obj.set_material(cap_mat)
        cap_pt = [tx, ty + 0.006, tz]
        obj.add_cylinder(cap_pt, 0.0060, 0.007, segments=14) # Knurled cap

        # 4mm Banana socket inner bore (Brass)
        obj.set_material("M_Brass")
        bore_pt = [tx, ty + 0.0128, tz]
        obj.add_cylinder(bore_pt, 0.0022, 0.0005, segments=8)

    # ── 8. RUBBER BASE FEET (M_TerminalBlack) ─────────────────────────────────
    obj.set_material("M_TerminalBlack")
    foot_r = 0.005
    foot_h = 0.003
    feet_pos = [
        (-w + 0.012, -foot_h, df + 0.012),
        ( w - 0.012, -foot_h, df + 0.012),
        (-w + 0.012, -foot_h, db - 0.012),
        ( w - 0.012, -foot_h, db - 0.012)
    ]
    for fx, fy, fz in feet_pos:
        obj.add_cylinder([fx, fy, fz], foot_r, foot_h, segments=10)

    obj.write()


def generate_voltmeter_needle():
    obj = ObjWriter("Voltmeter_Needle.obj", "Voltmeter_Lab_Pro.mtl")

    # Pivot center is at origin (0, 0, 0)
    # Needle points in +Y direction, thickness in Z, width in X
    # Total pointer length: 0.050m (5.0 cm)
    # Counterweight tail length: 0.010m (1.0 cm) in -Y direction

    # 1. Central Pivot Hub Collar (M_NeedleHub)
    obj.set_material("M_NeedleHub")
    obj.add_cylinder([0, 0, -0.001], 0.0032, 0.0024, segments=16)

    # Jewel bearing inner screw
    obj.set_material("M_Brass")
    obj.add_cylinder([0, 0, 0.0005], 0.0014, 0.0012, segments=12)

    # 2. Main Indicator Blade (M_NeedleRed)
    obj.set_material("M_NeedleRed")

    # Blade vertices from pivot Y=0.003 up to Y=0.048
    # Base width = 1.6mm (half = 0.0008), tip width = 0.25mm (half = 0.000125)
    # Thickness = 0.3mm (half = 0.00015)
    t = 0.0002
    w_base = 0.0008
    w_tip = 0.00015
    y_base = 0.003
    y_tip = 0.049

    v1 = obj.add_vertex(-w_base, y_base, -t)
    v2 = obj.add_vertex( w_base, y_base, -t)
    v3 = obj.add_vertex( w_tip,  y_tip,  -t)
    v4 = obj.add_vertex(-w_tip,  y_tip,  -t)

    v5 = obj.add_vertex(-w_base, y_base,  t)
    v6 = obj.add_vertex( w_base, y_base,  t)
    v7 = obj.add_vertex( w_tip,  y_tip,   t)
    v8 = obj.add_vertex(-w_tip,  y_tip,   t)

    n_front = obj.add_normal(0, 0, 1)
    n_back  = obj.add_normal(0, 0, -1)
    n_left  = obj.add_normal(-1, 0, 0)
    n_right = obj.add_normal( 1, 0, 0)
    n_top   = obj.add_normal( 0, 1, 0)

    # Front face
    obj.add_quad(v5, v6, v7, v8, n=n_front)
    # Back face
    obj.add_quad(v2, v1, v4, v3, n=n_back)
    # Left edge
    obj.add_quad(v1, v5, v8, v4, n=n_left)
    # Right edge
    obj.add_quad(v6, v2, v3, v7, n=n_right)
    # Top knife-edge
    obj.add_quad(v8, v7, v3, v4, n=n_top)

    # 3. Teardrop Counterweight Tail (Y: -0.002 to -0.011)
    # Expands to balance moment of inertia
    w_cw = 0.0016
    y_cw1 = -0.003
    y_cw2 = -0.009
    y_cwend = -0.012

    vc1 = obj.add_vertex(-w_base, y_cw1, t)
    vc2 = obj.add_vertex( w_base, y_cw1, t)
    vc3 = obj.add_vertex( w_cw,   y_cw2, t)
    vc4 = obj.add_vertex(-w_cw,   y_cw2, t)
    vc5 = obj.add_vertex( 0.0,    y_cwend, t)

    vc1_b = obj.add_vertex(-w_base, y_cw1, -t)
    vc2_b = obj.add_vertex( w_base, y_cw1, -t)
    vc3_b = obj.add_vertex( w_cw,   y_cw2, -t)
    vc4_b = obj.add_vertex(-w_cw,   y_cw2, -t)
    vc5_b = obj.add_vertex( 0.0,    y_cwend, -t)

    obj.add_quad(vc1, vc2, vc3, vc4, n=n_front)
    obj.add_triangle(vc4, vc3, vc5, n1=n_front, n2=n_front, n3=n_front)

    obj.add_quad(vc2_b, vc1_b, vc4_b, vc3_b, n=n_back)
    obj.add_triangle(vc3_b, vc4_b, vc5_b, n1=n_back, n2=n_back, n3=n_back)

    obj.write()

if __name__ == "__main__":
    generate_mtl()
    generate_voltmeter_chassis()
    generate_voltmeter_needle()
    print("✓ All Voltmeter 3D assets generated successfully.")
