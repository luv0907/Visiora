"""Download the Poly Haven (CC0) textures and HDRI used by the Visiora lab scenes.

Usage: python3 blender/fetch_polyhaven.py   (files land in blender/assets/polyhaven/)
"""
import json, os, sys, urllib.request

OUT = os.path.join(os.path.dirname(__file__), "assets", "polyhaven")
RES = "2k"
TEXTURES = [
    "painted_plaster_wall", "blue_plaster_wall", "beige_wall_001", "terrazzo_tiles",
    "wood_table_worn", "wood_cabinet_worn_long", "wood_peeling_paint_weathered",
    "white_plaster_02", "red_brick_03", "rusty_painted_metal", "green_metal_rust",
]
MAPS = {"Diffuse": "diff", "nor_gl": "nor_gl", "Rough": "rough"}
HDRIS = ["sunny_rose_garden"]
# 3D models (glTF). Plants get 2k textures, small props 1k.
MODELS_2K = ["potted_plant_01", "potted_plant_02", "potted_plant_04", "pachira_aquatica_01", "calathea_orbifolia_01",
             "anthurium_botany_01", "fern_02", "planter_box_01"]
MODELS_1K = ["planter_pot_clay", "chemistry_set", "bunsen_burner", "vintage_microscope", "retro_multimeter",
             "magnifying_glass_01", "circuit_board", "desk_lamp_arm_01", "clipboard", "office_notepads",
             "stationery_supplies", "binder_notebook", "book_encyclopedia_set_01", "decorative_book_set_01",
             "korean_fire_extinguisher_01", "fire_alarm", "standing_chalkboard_01", "wooden_crate_01",
             "cardboard_box_01", "metal_trash_can", "wooden_ladder", "wicker_basket_01", "vintage_cabinet_01",
             "Shelf_01", "SchoolChair_01", "WoodenChair_01", "ceiling_fan", "industrial_wall_lamp",
             "caged_hanging_light", "hanging_picture_frame_01", "hanging_picture_frame_02", "hanging_picture_frame_03"]
UA = {"User-Agent": "Visiora-Blender/1.0"}

def get_json(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return json.load(r)

def download(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return 0
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r, open(path, "wb") as f:
        n = 0
        while chunk := r.read(1 << 16):
            f.write(chunk); n += len(chunk)
    return n

total = 0
for tid in TEXTURES:
    files = get_json(f"https://api.polyhaven.com/files/{tid}")
    os.makedirs(os.path.join(OUT, tid), exist_ok=True)
    for key, short in MAPS.items():
        entry = files.get(key, {}).get(RES, {})
        fmt = "jpg" if "jpg" in entry else ("png" if "png" in entry else None)
        if not fmt:
            print(f"  ! {tid}: no {key} at {RES}"); continue
        total += download(entry[fmt]["url"], os.path.join(OUT, tid, f"{tid}_{short}_{RES}.{fmt}"))
    print("ok", tid)
for hid in HDRIS:
    files = get_json(f"https://api.polyhaven.com/files/{hid}")
    url = files["hdri"][RES]["hdr"]["url"]
    total += download(url, os.path.join(OUT, f"{hid}_{RES}.hdr"))
    print("ok", hid)
for mid, res in [(m, "2k") for m in MODELS_2K] + [(m, "1k") for m in MODELS_1K]:
    files = get_json(f"https://api.polyhaven.com/files/{mid}")
    entry = files.get("gltf", {}).get(res) or next(iter(files.get("gltf", {}).values()), None)
    if not entry:
        print(f"  ! {mid}: no gltf"); continue
    g = entry["gltf"]
    mdir = os.path.join(OUT, "models", mid); os.makedirs(mdir, exist_ok=True)
    total += download(g["url"], os.path.join(mdir, os.path.basename(g["url"])))
    for rel, inc in g.get("include", {}).items():
        dest = os.path.join(mdir, rel); os.makedirs(os.path.dirname(dest), exist_ok=True)
        total += download(inc["url"], dest)
    print("ok", mid)
print(f"downloaded {total / 1e6:.1f} MB")
