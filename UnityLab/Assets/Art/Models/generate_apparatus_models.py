import math
import os
import numpy as np
import generate_voltmeter_model as gvm

OUTPUT_DIR = gvm.OUTPUT_DIR

def generate_rheostat_models():
    # ── Rheostat Body ────────────────────────────────────────────────────────
    obj = gvm.ObjWriter("Rheostat_Lab_Pro.obj", "Voltmeter_Lab_Pro.mtl")
    
    # Dimensions: Length = 0.22m (22cm), Tube Radius = 0.022m, Height = 0.075m
    length = 0.20 # 20cm winding length
    half_l = length * 0.5
    r_tube = 0.020 # 4cm diameter tube
    
    # 1. Porcelain Winding Tube (M_DialPlate / M_Bakelite)
    obj.set_material("M_DialPlate")
    # Cylinder along X axis: from -half_l to +half_l, center at y = 0.035, z = 0
    y_center = 0.038
    segments = 20
    for i in range(segments):
        a1 = 2 * math.pi * i / segments
        a2 = 2 * math.pi * (i + 1) / segments
        y1, z1 = y_center + r_tube * math.cos(a1), r_tube * math.sin(a1)
        y2, z2 = y_center + r_tube * math.cos(a2), r_tube * math.sin(a2)
        
        v1 = obj.add_vertex(-half_l, y1, z1)
        v2 = obj.add_vertex( half_l, y1, z1)
        v3 = obj.add_vertex( half_l, y2, z2)
        v4 = obj.add_vertex(-half_l, y2, z2)
        
        u1 = i / float(segments)
        u2 = (i + 1) / float(segments)
        uv1 = obj.add_uv(u1, 0.0)
        uv2 = obj.add_uv(u1, 1.0)
        uv3 = obj.add_uv(u2, 1.0)
        uv4 = obj.add_uv(u2, 0.0)
        
        obj.add_quad(v1, v2, v3, v4, uv1, uv2, uv3, uv4)
        
    # 2. Cast Iron / Ebonite End Supports (Left & Right)
    obj.set_material("M_Bakelite")
    stand_thick = 0.012
    stand_w = 0.055
    stand_h = 0.068
    
    for side in [-1, 1]:
        cx = side * (half_l + stand_thick * 0.5)
        # Main upright pillar
        p_base = [cx - stand_thick*0.5, 0, -stand_w*0.5]
        # Box from cx-thick/2 to cx+thick/2, y from 0 to stand_h, z from -stand_w/2 to +stand_w/2
        v_bfl = obj.add_vertex(cx - stand_thick*0.5, 0, -stand_w*0.5)
        v_bfr = obj.add_vertex(cx + stand_thick*0.5, 0, -stand_w*0.5)
        v_bbr = obj.add_vertex(cx + stand_thick*0.5, 0,  stand_w*0.5)
        v_bbl = obj.add_vertex(cx - stand_thick*0.5, 0,  stand_w*0.5)
        
        v_tfl = obj.add_vertex(cx - stand_thick*0.5, stand_h, -stand_w*0.5)
        v_tfr = obj.add_vertex(cx + stand_thick*0.5, stand_h, -stand_w*0.5)
        v_tbr = obj.add_vertex(cx + stand_thick*0.5, stand_h,  stand_w*0.5)
        v_tbl = obj.add_vertex(cx - stand_thick*0.5, stand_h,  stand_w*0.5)
        
        obj.add_quad(v_bfl, v_bbl, v_bbr, v_bfr, n=obj.add_normal(0, -1, 0))
        obj.add_quad(v_tfl, v_tfr, v_tbr, v_tbl, n=obj.add_normal(0, 1, 0))
        obj.add_quad(v_bfl, v_bfr, v_tfr, v_tfl, n=obj.add_normal(0, 0, -1))
        obj.add_quad(v_bbl, v_tbl, v_tbr, v_bbr, n=obj.add_normal(0, 0, 1))
        obj.add_quad(v_bbl, v_bfl, v_tfl, v_tbl, n=obj.add_normal(-1*side, 0, 0))
        obj.add_quad(v_bfr, v_bbr, v_tbr, v_tfr, n=obj.add_normal(1*side, 0, 0))
        
        # Rubber foot on each end
        obj.set_material("M_TerminalBlack")
        obj.add_cylinder([cx, -0.003, -stand_w*0.35], 0.005, 0.003, segments=8)
        obj.add_cylinder([cx, -0.003,  stand_w*0.35], 0.005, 0.003, segments=8)
        obj.set_material("M_Bakelite")

    # 3. Hexagonal Slider Guide Rail (M_Brass)
    obj.set_material("M_Brass")
    y_rail = y_center + r_tube + 0.012
    r_rail = 0.0035
    for i in range(6):
        a1 = 2 * math.pi * i / 6
        a2 = 2 * math.pi * (i + 1) / 6
        y1, z1 = y_rail + r_rail * math.cos(a1), r_rail * math.sin(a1)
        y2, z2 = y_rail + r_rail * math.cos(a2), r_rail * math.sin(a2)
        v1 = obj.add_vertex(-half_l - 0.008, y1, z1)
        v2 = obj.add_vertex( half_l + 0.008, y1, z1)
        v3 = obj.add_vertex( half_l + 0.008, y2, z2)
        v4 = obj.add_vertex(-half_l - 0.008, y2, z2)
        obj.add_quad(v1, v2, v3, v4)

    # 4. Three Knurled Brass Binding Posts
    # Terminal 1: Left Bottom fixed end
    # Terminal 2: Right Bottom fixed end
    # Terminal 3: Top Slider terminal (on right support)
    posts = [
        (-half_l - 0.006, 0.014, -stand_w*0.45, "M_TerminalBlack"),
        ( half_l + 0.006, 0.014, -stand_w*0.45, "M_TerminalRed"),
        ( half_l + 0.006, stand_h - 0.008, stand_w*0.40, "M_TerminalRed")
    ]
    for px, py, pz, mat in posts:
        obj.set_material("M_Brass")
        obj.add_cylinder([px, py, pz], 0.005, 0.004, segments=8)
        obj.add_cylinder([px, py + 0.004, pz], 0.0026, 0.009, segments=10)
        obj.set_material(mat)
        obj.add_cylinder([px, py + 0.006, pz], 0.0055, 0.006, segments=12)

    obj.write()

    # ── Rheostat Sliding Carriage (M_Bakelite + M_Brass) ─────────────────────
    obj_sl = gvm.ObjWriter("Rheostat_Slider.obj", "Voltmeter_Lab_Pro.mtl")
    obj_sl.set_material("M_Bakelite")
    
    # Slider block: rides along rail at (0, y_rail, 0)
    # Width = 2.4cm, Height = 2.0cm, Depth = 2.2cm
    bw = 0.012
    bh = 0.011
    bd = 0.012
    
    v1 = obj_sl.add_vertex(-bw, y_rail - bh*0.4, -bd)
    v2 = obj_sl.add_vertex( bw, y_rail - bh*0.4, -bd)
    v3 = obj_sl.add_vertex( bw, y_rail + bh,     -bd)
    v4 = obj_sl.add_vertex(-bw, y_rail + bh,     -bd)
    
    v5 = obj_sl.add_vertex(-bw, y_rail - bh*0.4,  bd)
    v6 = obj_sl.add_vertex( bw, y_rail - bh*0.4,  bd)
    v7 = obj_sl.add_vertex( bw, y_rail + bh,      bd)
    v8 = obj_sl.add_vertex(-bw, y_rail + bh,      bd)
    
    obj_sl.add_quad(v1, v2, v3, v4, n=obj_sl.add_normal(0, 0, -1))
    obj_sl.add_quad(v6, v5, v8, v7, n=obj_sl.add_normal(0, 0,  1))
    obj_sl.add_quad(v5, v1, v4, v8, n=obj_sl.add_normal(-1, 0, 0))
    obj_sl.add_quad(v2, v6, v7, v3, n=obj_sl.add_normal( 1, 0, 0))
    obj_sl.add_quad(v4, v3, v7, v8, n=obj_sl.add_normal( 0, 1, 0))
    obj_sl.add_quad(v1, v5, v6, v2, n=obj_sl.add_normal( 0, -1, 0))
    
    # Knurled Thumb-Screw Locking Knob on top
    obj_sl.set_material("M_Brass")
    obj_sl.add_cylinder([0, y_rail + bh, 0], 0.0045, 0.006, segments=12)
    obj_sl.set_material("M_Bakelite")
    obj_sl.add_cylinder([0, y_rail + bh + 0.005, 0], 0.006, 0.004, segments=14)
    
    # Phosphor-Bronze Wiper Contact Blade riding on coil
    obj_sl.set_material("M_Brass")
    # Tapers down from slider block to touch top of tube at (0, y_center + r_tube, 0)
    y_contact = y_center + r_tube + 0.0005
    vw1 = obj_sl.add_vertex(-0.004, y_rail - bh*0.3, -0.003)
    vw2 = obj_sl.add_vertex( 0.004, y_rail - bh*0.3, -0.003)
    vw3 = obj_sl.add_vertex( 0.003, y_contact, 0)
    vw4 = obj_sl.add_vertex(-0.003, y_contact, 0)
    obj_sl.add_quad(vw1, vw2, vw3, vw4)
    
    obj_sl.write()


def generate_plug_key_models():
    # ── Single-Pole Plug Key Base ────────────────────────────────────────────
    obj = gvm.ObjWriter("PlugKey_Lab_Pro.obj", "Voltmeter_Lab_Pro.mtl")
    
    # Base: Heavy Ebonite base 9cm x 6cm x 1.6cm
    obj.set_material("M_Bakelite")
    w = 0.045
    d = 0.030
    h = 0.016
    
    v1 = obj.add_vertex(-w, 0, -d)
    v2 = obj.add_vertex( w, 0, -d)
    v3 = obj.add_vertex( w, h, -d)
    v4 = obj.add_vertex(-w, h, -d)
    
    v5 = obj.add_vertex(-w, 0,  d)
    v6 = obj.add_vertex( w, 0,  d)
    v7 = obj.add_vertex( w, h,  d)
    v8 = obj.add_vertex(-w, h,  d)
    
    obj.add_quad(v1, v2, v3, v4, n=obj.add_normal(0, 0, -1))
    obj.add_quad(v6, v5, v8, v7, n=obj.add_normal(0, 0,  1))
    obj.add_quad(v5, v1, v4, v8, n=obj.add_normal(-1, 0, 0))
    obj.add_quad(v2, v6, v7, v3, n=obj.add_normal( 1, 0, 0))
    obj.add_quad(v4, v3, v7, v8, n=obj.add_normal( 0, 1, 0))
    obj.add_quad(v1, v5, v6, v2, n=obj.add_normal( 0, -1, 0))
    
    # 4 Rubber Feet
    obj.set_material("M_TerminalBlack")
    for fx in [-w + 0.008, w - 0.008]:
        for fz in [-d + 0.008, d - 0.008]:
            obj.add_cylinder([fx, -0.003, fz], 0.004, 0.003, segments=8)
            
    # Two Solid Brass Split Blocks on top:
    # Left Block: X from -0.032 to -0.002
    # Right Block: X from +0.002 to +0.032
    # Gap in middle: 4mm with precision central conical taper hole
    obj.set_material("M_Brass")
    bw = 0.028
    bd = 0.018
    bh = 0.012
    
    for side in [-1, 1]:
        bx = side * (0.003 + bw * 0.5)
        v_b1 = obj.add_vertex(bx - bw*0.5, h, -bd*0.5)
        v_b2 = obj.add_vertex(bx + bw*0.5, h, -bd*0.5)
        v_b3 = obj.add_vertex(bx + bw*0.5, h + bh, -bd*0.5)
        v_b4 = obj.add_vertex(bx - bw*0.5, h + bh, -bd*0.5)
        
        v_b5 = obj.add_vertex(bx - bw*0.5, h,  bd*0.5)
        v_b6 = obj.add_vertex(bx + bw*0.5, h,  bd*0.5)
        v_b7 = obj.add_vertex(bx + bw*0.5, h + bh,  bd*0.5)
        v_b8 = obj.add_vertex(bx - bw*0.5, h + bh,  bd*0.5)
        
        obj.add_quad(v_b1, v_b2, v_b3, v_b4)
        obj.add_quad(v_b6, v_b5, v_b8, v_b7)
        obj.add_quad(v_b5, v_b1, v_b4, v_b8)
        obj.add_quad(v_b2, v_b6, v_b7, v_b3)
        obj.add_quad(v_b4, v_b3, v_b7, v_b8, n=obj.add_normal(0, 1, 0))
        
        # Knurled Brass Binding Post on each block
        tx = side * 0.024
        obj.add_cylinder([tx, h + bh, 0], 0.0045, 0.003, segments=8)
        obj.add_cylinder([tx, h + bh + 0.003, 0], 0.0025, 0.008, segments=10)
        obj.add_cylinder([tx, h + bh + 0.005, 0], 0.0052, 0.005, segments=12)

    # Conical Taper Hole in the center: simulated by dark recessed cylinder
    obj.set_material("M_Bezel")
    obj.add_cylinder([0, h, 0], 0.0042, bh * 0.9, segments=14)

    obj.write()

    # ── Machined Brass Plug with Insulating Knob ─────────────────────────────
    obj_plug = gvm.ObjWriter("PlugKey_Plug.obj", "Voltmeter_Lab_Pro.mtl")
    
    # Origin at (0, 0, 0) = bottom tip of conical plug
    # 1. Tapered Brass Pin (M_Brass)
    obj_plug.set_material("M_Brass")
    obj_plug.add_cylinder([0, 0.001, 0], 0.0038, 0.014, segments=16) # brass pin
    
    # 2. Brass Collar Flange
    obj_plug.add_cylinder([0, 0.014, 0], 0.0065, 0.003, segments=16)
    
    # 3. Fluted/Knurled Ebonite Top Handle (M_Bakelite)
    obj_plug.set_material("M_Bakelite")
    obj_plug.add_cylinder([0, 0.017, 0], 0.0085, 0.016, segments=18)
    # Rounded crown
    obj_plug.add_cylinder([0, 0.033, 0], 0.0070, 0.003, segments=14)
    
    obj_plug.write()


if __name__ == "__main__":
    generate_rheostat_models()
    generate_plug_key_models()
    print("✓ All Rheostat & Plug Key 3D models generated.")
