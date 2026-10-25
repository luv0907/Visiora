"""Build the browser version of the Visiora physics lab from the Blender master.

Run inside Blender (stages can be run one at a time, since baking takes minutes):

    exec(open("/path/to/blender/scripts/build_web_lab.py").read())
    stage_open()         # open the master and save it as the web copy (run alone: it resets Blender's context)
    stage_prepare()      # make geometry plain, UVs, web materials, merge
    stage_lightmap_uvs() # second UV map ("LightUV") on every merged static mesh
    bake_one("Static_Shell")  # … for each name in static_names(); bakes direct + indirect light
    stage_export()       # GLB (scenery + moving parts) and lightmap PNGs

Then compress (see README in blender/):
    npx @gltf-transform/cli@4 optimize physics_lab_raw.glb physics_lab.glb --compress meshopt \
        --texture-compress webp --texture-size 1024 --join false --flatten false \
        --prune-attributes false --simplify false --palette false
"""
import bpy, os, math, json
from mathutils import Vector

ROOT = "/Users/bouroju/Documents/mini-ai-video"
MASTER = f"{ROOT}/blender/physics_lab_hall.blend"
WEB = f"{ROOT}/blender/physics_lab_hall_web.blend"
EXPORT = f"{ROOT}/blender/export"
LIGHTMAPS = f"{EXPORT}/lightmaps"
INTERACTIVE = ("FF_SteelBall", "FF_Feather", "FF_Tube0", "FF_Tube1", "FF_GaugeNeedle")
# Lightmaps are stored as 8-bit sRGB of (light / LM_SCALE); the browser multiplies back.
LM_SCALE = 4.0
LM_SIZE = {"Static_Shell": 4096, "Static_Structure": 2048, "Static_Furniture": 4096, "Static_Stations": 2048,
           "Static_Props": 2048, "Static_Plants": 2048, "Static_Decor": 2048, "Static_Clutter": 2048, "Static_Lab": 1024}


def _select(objs, active=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = active or (objs[0] if objs else None)


def static_names():
    return [o.name for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith("Static_")]


def stage_open():
    bpy.ops.wm.open_mainfile(filepath=MASTER)
    bpy.ops.wm.save_as_mainfile(filepath=WEB)
    return bpy.data.filepath


def stage_prepare():
    assert bpy.data.filepath == WEB, "run stage_open() first"
    exec(bpy.data.texts["lab_helpers.py"].as_string(), globals())
    O, C, sc = bpy.data.objects, bpy.data.collections, bpy.context.scene
    # drop what the web scene doesn't need; KEEP the lights for baking
    for n in ("Cutters", "Atmosphere"):
        if C.get(n):
            for o in list(C[n].all_objects): O.remove(o, do_unlink=True)
    for o in list(O):
        if o.type == 'CAMERA' or o.name == "Haze": O.remove(o, do_unlink=True)
        elif o.type == 'LIGHT' and o.data.type == 'AREA' and getattr(o.data.cycles, "is_portal", False):
            pass  # portals help the sky light through the windows bake cleanly
    # moving parts of the Free Fall Tower stay separate
    inter = coll("Interactive")
    g = O["FF_GaugeFace"]
    nd = box("FF_GaugeNeedle", (0.006, 0.012, 0.11), (g.location.x + 0.012, g.location.y, g.location.z + 0.04), bpy.data.materials["Black_Plastic"], inter)
    nd.rotation_euler = (math.radians(-50), 0, 0)
    for n in INTERACTIVE[:-1]: put(O[n], inter)
    # plain geometry in world space
    bpy.context.view_layer.layer_collection.children["Library"].exclude = False
    lib = set(C["Library"].all_objects)
    targets = [o for o in sc.objects if o.type in ('MESH', 'CURVE', 'FONT') and o not in lib]
    _select(targets)
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.make_single_user(object=True, obdata=True, material=False)
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in list(C["Library"].all_objects): O.remove(o, do_unlink=True)
    for o in list(O):
        if o.type == 'EMPTY': O.remove(o, do_unlink=True)
    # moving parts get their pivots back
    for n in INTERACTIVE[:-1]:
        _select([O[n]]); bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    pts = [O["FF_GaugeFace"].matrix_world @ Vector(v) for v in O["FF_GaugeFace"].bound_box]
    c = sum(pts, Vector()) / 8
    sc.cursor.location = (c.x + 0.012, c.y, c.z)
    _select([O["FF_GaugeNeedle"]]); bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    _web_materials_and_uvs()
    # merge static scenery by area
    for coll_ in list(C):
        if coll_.name in ("Interactive", "Library", "Lighting"): continue
        objs = [o for o in coll_.objects if o.type == 'MESH']
        if len(objs) < 1: continue
        if len(objs) > 1:
            _select(objs); bpy.ops.object.join()
        objs[0].name = f"Static_{coll_.name}"
    bpy.ops.wm.save_mainfile()
    return static_names()


def _web_materials_and_uvs():
    """World-projected textures → real UVs at 1 UV unit = 1 m; materials simplified to what glTF supports."""
    sc = bpy.context.scene
    box_mats = {m for m in bpy.data.materials if m.use_nodes and any(n.type == 'NEW_GEOMETRY' for n in m.node_tree.nodes)
                and any(n.type == 'TEX_IMAGE' for n in m.node_tree.nodes)}
    targets = [o for o in sc.objects if o.type == 'MESH' and any(m in box_mats for m in o.data.materials)]
    _select(targets)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.cube_project(cube_size=1.0, correct_aspect=False, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    PAINT = {"Cabinet_Teal": (0.075, 0.22, 0.2), "Cabinet_Green": (0.1, 0.18, 0.1)}
    for m in box_mats:
        nt = m.node_tree; N = nt.nodes; L = nt.links; bsdf = N["Principled BSDF"]
        mp = next(n for n in N if n.type == 'MAPPING')
        tc = N.new("ShaderNodeTexCoord"); L.new(tc.outputs["UV"], mp.inputs["Vector"])
        for n in N:
            if n.type == 'TEX_IMAGE': n.projection = 'FLAT'
        for hs in [n for n in N if n.type == 'HUE_SAT']:
            src = hs.inputs["Color"].links[0].from_socket
            for l in list(hs.outputs["Color"].links): L.new(src, l.to_socket)
            N.remove(hs)
        wx = N.get("WX_Mix")
        if wx:
            L.new(wx.inputs[6].links[0].from_socket, bsdf.inputs["Base Color"]); N.remove(wx)
        for mm in [n for n in N if n.type == 'MATH' and n.operation == 'MULTIPLY' and n.outputs[0].links
                   and n.outputs[0].links[0].to_socket == bsdf.inputs["Roughness"]]:
            L.new(mm.inputs[0].links[0].from_socket, bsdf.inputs["Roughness"]); N.remove(mm)
        for n in [n for n in N if n.type in ('NEW_GEOMETRY', 'SEPXYZ', 'TEX_NOISE', 'MAP_RANGE', 'MATH', 'RGBTOBW', 'COMBINE_COLOR')]:
            N.remove(n)
        if m.name in PAINT:
            for l in list(bsdf.inputs["Base Color"].links): L.remove(l)
            bsdf.inputs["Base Color"].default_value = (*PAINT[m.name], 1)
            for n in [n for n in N if n.type == 'MIX']: N.remove(n)
            for n in [n for n in N if n.type == 'TEX_IMAGE' and not n.outputs["Color"].links]: N.remove(n)
        if m.name == "Floor_Terrazzo":
            img = bsdf.inputs["Base Color"].links[0].from_socket
            if img.node.type != 'MIX':
                mix = N.new("ShaderNodeMix"); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs[0].default_value = 1.0
                L.new(img, mix.inputs[6]); mix.inputs[7].default_value = (0.86, 0.82, 0.76, 1); L.new(mix.outputs[2], bsdf.inputs["Base Color"])
    for o in sc.objects:
        if o.type != 'MESH': continue
        uv = o.data.uv_layers
        if len(uv) == 0: uv.new(name="UVMap")
        uv[0].name = "UVMap"
        while len(uv) > 1: uv.remove(uv[1])


def stage_lightmap_uvs():
    for name in static_names():
        o = bpy.data.objects[name]
        uv = o.data.uv_layers
        lm = uv.get("LightUV") or uv.new(name="LightUV")
        uv.active = lm
        _select([o])
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004, area_weight=0.0, scale_to_bounds=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        uv["UVMap"].active_render = True     # textures keep using the first UV map
    bpy.ops.wm.save_mainfile()


def bake_one(name, samples=192):
    """Bake light arriving at each surface (direct + indirect, no surface colour) into a lightmap."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'GPU'
    sc.cycles.samples = samples; sc.cycles.use_denoising = False
    o = bpy.data.objects[name]
    size = LM_SIZE.get(name, 2048)
    img = bpy.data.images.get(f"LM_{name}") or bpy.data.images.new(f"LM_{name}", size, size, float_buffer=True)
    for m in o.data.materials:
        if not m or not m.use_nodes: continue
        N = m.node_tree.nodes
        tn = N.get("LM_Target") or N.new("ShaderNodeTexImage"); tn.name = "LM_Target"
        tn.image = img
        N.active = tn
    o.data.uv_layers.active = o.data.uv_layers["LightUV"]
    _select([o])
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=6, margin_type='EXTEND', use_clear=True)
    os.makedirs(LIGHTMAPS, exist_ok=True)
    img.filepath_raw = f"{LIGHTMAPS}/{name}.exr"; img.file_format = 'OPEN_EXR'; img.save()
    return img.filepath_raw


def stage_export():
    """Remove bake helpers, export the GLB without lights, write 8-bit sRGB lightmaps + a manifest."""
    import numpy as np
    sc = bpy.context.scene
    for m in bpy.data.materials:
        if m.use_nodes and m.node_tree.nodes.get("LM_Target"):
            m.node_tree.nodes.remove(m.node_tree.nodes["LM_Target"])
    manifest = {"scale": LM_SCALE, "maps": {}}
    for name in static_names():
        img = bpy.data.images.get(f"LM_{name}")
        if not img: continue
        w, h = img.size
        px = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(px)
        px = px.reshape(-1, 4)
        rgb = np.clip(px[:, :3] / LM_SCALE, 0, 1)
        srgb = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * np.power(rgb, 1 / 2.4) - 0.055)
        out = bpy.data.images.new(f"LMout_{name}", w, h, alpha=False)
        flat = np.concatenate([srgb, np.ones((srgb.shape[0], 1), dtype=np.float32)], axis=1).ravel()
        out.pixels.foreach_set(flat)
        out.filepath_raw = f"{LIGHTMAPS}/{name}.png"; out.file_format = 'PNG'; out.save()
        manifest["maps"][name] = f"{name}.webp"
    json.dump(manifest, open(f"{LIGHTMAPS}/manifest.json", "w"), indent=1)
    for o in list(bpy.data.objects):
        if o.type == 'LIGHT': bpy.data.objects.remove(o, do_unlink=True)
    os.makedirs(EXPORT, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=f"{EXPORT}/physics_lab_raw.glb", export_format='GLB', use_selection=False,
                              export_apply=True, export_yup=True, export_cameras=False, export_lights=False,
                              export_animations=False, export_image_format='JPEG', export_texcoords=True)
    return manifest
