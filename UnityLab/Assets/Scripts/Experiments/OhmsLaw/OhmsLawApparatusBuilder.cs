using UnityEngine;
using Visora.Laboratory;

namespace Visora.Experiments.OhmsLaw
{
    /// <summary>
    /// Constructs photorealistic 3D laboratory apparatus for the Ohm's Law experiment.
    /// Builds authentic voltmeters, ammeters, precision sliding rheostat, DC power supply,
    /// brass plug key, standard resistor spool, and 3D curved connecting wires.
    /// Ensures every component sits solidly on top of the workbench with responsive colliders.
    /// </summary>
    public static class OhmsLawApparatusBuilder
    {
        public struct ApparatusRefs
        {
            public Transform VoltmeterNeedle;
            public Transform AmmeterNeedle;
            public Transform RheostatSlider;
            public Transform SwitchPlug;
            public Renderer ResistorRenderer;
            public Transform PowerSupplyKnob;
            public SwitchInteractable SwitchComponent;
            public RheostatInteractable RheostatComponent;
        }

        public static ApparatusRefs BuildApparatus(Transform root, OhmsLawController controller = null)
        {
            ApparatusRefs refs = new ApparatusRefs();

            // Load materials with guaranteed fallbacks and 2K textures
            Material matVoltmeterDial = VisoraLabMaterials.GetMaterial("Lab_VoltmeterDial");
            Material matAmmeterDial   = VisoraLabMaterials.GetMaterial("Lab_AmmeterDial");
            Material matPowerSupply   = VisoraLabMaterials.GetMaterial("Lab_PowerSupplyPanel");
            Material matRheostatWire  = VisoraLabMaterials.GetMaterial("Lab_RheostatWire");
            Material matBrass         = VisoraLabMaterials.GetMaterial("Lab_Brass");
            Material matCopper        = VisoraLabMaterials.GetMaterial("Lab_Copper");
            Material matEbonite       = VisoraLabMaterials.GetMaterial("Lab_Ebonite");
            Material matOak           = VisoraLabMaterials.GetMaterial("Lab_Oak");
            Material matGlass         = VisoraLabMaterials.GetMaterial("Lab_Glass");
            Material matNeedle        = VisoraLabMaterials.GetMaterial("Lab_NeedleRed");
            Material matWireRed       = VisoraLabMaterials.GetMaterial("Lab_WireRed");
            Material matWireBlack     = VisoraLabMaterials.GetMaterial("Lab_WireBlack");
            Material matWireYellow    = VisoraLabMaterials.GetMaterial("Lab_WireYellow");
            Material matMetalTrim     = VisoraLabMaterials.GetMaterial("Lab_MetalTrim");

            // Workbench surface top is exactly y = 0.90m
            // Workbench center is at z = 2.85m, depth 0.95m (z: 2.375 to 3.325m)
            // Student stands at z = 1.85m looking forward (+Z)
            float tableY = 0.90f;

            // ── 1. REGULATED DC POWER SUPPLY (Left Back: x = -0.65m, z = 2.95m) ──
            Vector3 psPos = new Vector3(-0.65f, tableY, 2.95f);
            var psGo = new GameObject("PowerSupply");
            psGo.transform.SetParent(root);
            psGo.transform.position = psPos;
            psGo.transform.rotation = Quaternion.Euler(0, 10f, 0);

            var psCol = psGo.AddComponent<BoxCollider>();
            psCol.center = new Vector3(0, 0.05f, 0);
            psCol.size = new Vector3(0.18f, 0.12f, 0.15f);

            var psModelPrefab = Resources.Load<GameObject>("Models/Equipment/PowerSupply_Lab_Pro");
            if (psModelPrefab != null)
            {
                var psInst = Object.Instantiate(psModelPrefab, psGo.transform);
                psInst.name = "ProMesh";
                psInst.transform.localPosition = Vector3.zero;
                psInst.transform.localRotation = Quaternion.identity;

                refs.PowerSupplyKnob = psInst.transform;
                var psTermPos = CreateBindingPost("Term_Positive", psGo.transform, new Vector3( 0.035f, 0.024f, -0.055f), matBrass, Color.red, Wiring.TerminalId.PowerSupply_Pos, "Power Supply (+)");
                var psTermNeg = CreateBindingPost("Term_Negative", psGo.transform, new Vector3( 0.051f, 0.024f, -0.055f), matBrass, Color.black, Wiring.TerminalId.PowerSupply_Neg, "Power Supply (-)");
            }
            else
            {
                var psBody = CreateBox("Body", psGo.transform, new Vector3(0, 0.08f, 0), new Vector3(0.28f, 0.16f, 0.20f), matEbonite);
                var psFront = CreateQuad("FrontPanel", psGo.transform, new Vector3(0, 0.08f, -0.101f), new Vector3(0.27f, 0.15f, 1f), Quaternion.identity, matPowerSupply);
                var psKnob = CreateCylinder("VoltageKnob", psGo.transform, new Vector3(-0.05f, 0.07f, -0.115f), new Vector3(0.045f, 0.015f, 0.045f), Quaternion.Euler(90f, 0, 0), matBrass);
                refs.PowerSupplyKnob = psKnob.transform;
                CreateBox("PowerRocker", psGo.transform, new Vector3(0.06f, 0.07f, -0.105f), new Vector3(0.028f, 0.020f, 0.012f), matNeedle);
                var psTermPos = CreateBindingPost("Term_Positive", psGo.transform, new Vector3(0.04f, 0.035f, -0.11f), matBrass, Color.red, Wiring.TerminalId.PowerSupply_Pos, "Power Supply (+)");
                var psTermNeg = CreateBindingPost("Term_Negative", psGo.transform, new Vector3(0.09f, 0.035f, -0.11f), matBrass, Color.black, Wiring.TerminalId.PowerSupply_Neg, "Power Supply (-)");
            }

            // ── 2. ONE-WAY PLUG KEY (Left Front: x = -0.42m, z = 2.65m) ────────
            Vector3 keyPos = new Vector3(-0.42f, tableY, 2.65f);
            var keyGo = new GameObject("PlugKey");
            keyGo.transform.SetParent(root);
            keyGo.transform.position = keyPos;
            keyGo.transform.rotation = Quaternion.Euler(0, 15f, 0);

            var keyCol = keyGo.AddComponent<BoxCollider>();
            keyCol.center = new Vector3(0, 0.03f, 0);
            keyCol.size = new Vector3(0.12f, 0.07f, 0.10f);

            var keyModelPrefab = Resources.Load<GameObject>("Models/Equipment/PlugKey_Lab_Pro");
            var plugModelPrefab = Resources.Load<GameObject>("Models/Equipment/PlugKey_Plug");

            if (keyModelPrefab != null)
            {
                var keyInst = Object.Instantiate(keyModelPrefab, keyGo.transform);
                keyInst.name = "ProMesh";
                keyInst.transform.localPosition = Vector3.zero;
                keyInst.transform.localRotation = Quaternion.identity;

                var plugGo = new GameObject("PlugHandle");
                plugGo.transform.SetParent(keyGo.transform);
                plugGo.transform.localPosition = new Vector3(0f, 0.016f, 0f);

                if (plugModelPrefab != null)
                {
                    var plugInst = Object.Instantiate(plugModelPrefab, plugGo.transform);
                    plugInst.name = "PlugMesh";
                    plugInst.transform.localPosition = Vector3.zero;
                    plugInst.transform.localRotation = Quaternion.identity;
                }

                refs.SwitchPlug = plugGo.transform;

                var keyTerm1 = CreateBindingPost("Term_1", keyGo.transform, new Vector3(-0.024f, 0.028f, 0), matBrass, null, Wiring.TerminalId.Key_Term1, "Plug Key Term 1");
                var keyTerm2 = CreateBindingPost("Term_2", keyGo.transform, new Vector3( 0.024f, 0.028f, 0), matBrass, null, Wiring.TerminalId.Key_Term2, "Plug Key Term 2");

                var switchInteractable = keyGo.AddComponent<SwitchInteractable>();
                switchInteractable.Configure(controller, plugGo.transform);
                refs.SwitchComponent = switchInteractable;
            }
            else
            {
                CreateBox("EboniteBase", keyGo.transform, new Vector3(0, 0.0125f, 0), new Vector3(0.11f, 0.025f, 0.08f), matEbonite);
                CreateBox("BrassBlock1", keyGo.transform, new Vector3(-0.028f, 0.035f, 0), new Vector3(0.038f, 0.025f, 0.05f), matBrass);
                CreateBox("BrassBlock2", keyGo.transform, new Vector3( 0.028f, 0.035f, 0), new Vector3(0.038f, 0.025f, 0.05f), matBrass);
                var keyTerm1 = CreateBindingPost("Term_1", keyGo.transform, new Vector3(-0.035f, 0.048f, 0), matBrass, null, Wiring.TerminalId.Key_Term1, "Plug Key Term 1");
                var keyTerm2 = CreateBindingPost("Term_2", keyGo.transform, new Vector3( 0.035f, 0.048f, 0), matBrass, null, Wiring.TerminalId.Key_Term2, "Plug Key Term 2");

                var plugGo = new GameObject("PlugHandle");
                plugGo.transform.SetParent(keyGo.transform);
                plugGo.transform.localPosition = new Vector3(0f, 0.048f, 0f);
                CreateCylinder("Pin", plugGo.transform, Vector3.zero, new Vector3(0.016f, 0.025f, 0.016f), Quaternion.identity, matBrass);
                CreateCylinder("Knob", plugGo.transform, new Vector3(0, 0.025f, 0), new Vector3(0.028f, 0.020f, 0.028f), Quaternion.identity, matEbonite);
                refs.SwitchPlug = plugGo.transform;

                var switchInteractable = keyGo.AddComponent<SwitchInteractable>();
                switchInteractable.Configure(controller, plugGo.transform);
                refs.SwitchComponent = switchInteractable;
            }

            // ── 3. PRECISION SLIDING RHEOSTAT (Center: x = -0.05m, z = 2.95m) ──
            Vector3 rheoPos = new Vector3(-0.05f, tableY, 2.95f);
            var rheoGo = new GameObject("Rheostat");
            rheoGo.transform.SetParent(root);
            rheoGo.transform.position = rheoPos;
            rheoGo.transform.rotation = Quaternion.Euler(0, -5f, 0);

            var rheoCol = rheoGo.AddComponent<BoxCollider>();
            rheoCol.center = new Vector3(0, 0.045f, 0);
            rheoCol.size = new Vector3(0.26f, 0.10f, 0.10f);

            var rheoModelPrefab = Resources.Load<GameObject>("Models/Equipment/Rheostat_Lab_Pro");
            var sliderModelPrefab = Resources.Load<GameObject>("Models/Equipment/Rheostat_Slider");

            if (rheoModelPrefab != null)
            {
                var rheoInst = Object.Instantiate(rheoModelPrefab, rheoGo.transform);
                rheoInst.name = "ProMesh";
                rheoInst.transform.localPosition = Vector3.zero;
                rheoInst.transform.localRotation = Quaternion.identity;

                var sliderRoot = new GameObject("SliderAssembly");
                sliderRoot.transform.SetParent(rheoGo.transform);
                sliderRoot.transform.localPosition = new Vector3(-0.04f, 0f, 0f);

                if (sliderModelPrefab != null)
                {
                    var slInst = Object.Instantiate(sliderModelPrefab, sliderRoot.transform);
                    slInst.name = "SliderMesh";
                    slInst.transform.localPosition = Vector3.zero;
                    slInst.transform.localRotation = Quaternion.identity;
                }

                refs.RheostatSlider = sliderRoot.transform;

                var rheoTermIn  = CreateBindingPost("Term_LowerLeft", rheoGo.transform, new Vector3(-0.106f, 0.014f, -0.025f), matBrass, null, Wiring.TerminalId.Rheostat_Lower, "Rheostat Lower In");
                var rheoTermOut = CreateBindingPost("Term_SliderTop", rheoGo.transform, new Vector3( 0.106f, 0.060f,  0.022f), matBrass, null, Wiring.TerminalId.Rheostat_Slider, "Rheostat Slider Out");

                var rheostatInteractable = rheoGo.AddComponent<RheostatInteractable>();
                rheostatInteractable.Configure(controller, sliderRoot.transform);
                refs.RheostatComponent = rheostatInteractable;
            }
            else
            {
                CreateBox("EndStand_L", rheoGo.transform, new Vector3(-0.19f, 0.055f, 0), new Vector3(0.035f, 0.11f, 0.09f), matMetalTrim);
                CreateBox("EndStand_R", rheoGo.transform, new Vector3( 0.19f, 0.055f, 0), new Vector3(0.035f, 0.11f, 0.09f), matMetalTrim);
                CreateCylinder("ResistanceCoil", rheoGo.transform, new Vector3(0, 0.055f, 0), new Vector3(0.055f, 0.175f, 0.055f), Quaternion.Euler(0, 0, 90f), matRheostatWire);
                CreateCylinder("SliderBar", rheoGo.transform, new Vector3(0, 0.095f, 0), new Vector3(0.012f, 0.185f, 0.012f), Quaternion.Euler(0, 0, 90f), matBrass);

                var sliderRoot = new GameObject("SliderAssembly");
                sliderRoot.transform.SetParent(rheoGo.transform);
                sliderRoot.transform.localPosition = new Vector3(-0.08f, 0.095f, 0);
                CreateBox("SliderBlock", sliderRoot.transform, Vector3.zero, new Vector3(0.035f, 0.025f, 0.045f), matBrass);
                CreateCylinder("SliderKnob", sliderRoot.transform, new Vector3(0, 0.025f, 0), new Vector3(0.024f, 0.02f, 0.024f), Quaternion.identity, matEbonite);
                CreateBox("WiperContact", sliderRoot.transform, new Vector3(0, -0.025f, 0), new Vector3(0.020f, 0.025f, 0.015f), matCopper);
                refs.RheostatSlider = sliderRoot.transform;

                var rheoTermIn  = CreateBindingPost("Term_LowerLeft", rheoGo.transform, new Vector3(-0.19f, 0.03f, 0.045f), matBrass, null, Wiring.TerminalId.Rheostat_Lower, "Rheostat Lower In");
                var rheoTermOut = CreateBindingPost("Term_SliderTop", rheoGo.transform, new Vector3( 0.19f, 0.095f, 0.045f), matBrass, null, Wiring.TerminalId.Rheostat_Slider, "Rheostat Slider Out");

                var rheostatInteractable = rheoGo.AddComponent<RheostatInteractable>();
                rheostatInteractable.Configure(controller, sliderRoot.transform);
                refs.RheostatComponent = rheostatInteractable;
            }

            // ── 4. ANALOG AMMETER (Front Center-Right: x = 0.15m, z = 2.62m) ──
            Vector3 ammPos = new Vector3(0.15f, tableY, 2.62f);
            var ammeterGo = BuildMeter("Ammeter", ammPos, Quaternion.Euler(0, -12f, 0), root, matAmmeterDial, matEbonite, matGlass, matNeedle, matBrass,
                Wiring.TerminalId.Ammeter_Pos, Wiring.TerminalId.Ammeter_Neg);
            refs.AmmeterNeedle = ammeterGo.transform.Find("FaceAssembly/NeedlePivot");

            // ── 5. STANDARD RESISTANCE COIL (Right Center: x = 0.42m, z = 2.75m)
            Vector3 resPos = new Vector3(0.42f, tableY, 2.75f);
            var resGo = new GameObject("StandardResistor");
            resGo.transform.SetParent(root);
            resGo.transform.position = resPos;
            resGo.transform.rotation = Quaternion.Euler(0, 10f, 0);

            var resCol = resGo.AddComponent<BoxCollider>();
            resCol.center = new Vector3(0, 0.035f, 0);
            resCol.size = new Vector3(0.10f, 0.07f, 0.10f);

            var resModelPrefab = Resources.Load<GameObject>("Models/Equipment/StandardResistor_Lab_Pro");
            if (resModelPrefab != null)
            {
                var resInst = Object.Instantiate(resModelPrefab, resGo.transform);
                resInst.name = "ProMesh";
                resInst.transform.localPosition = Vector3.zero;
                resInst.transform.localRotation = Quaternion.identity;

                refs.ResistorRenderer = resInst.GetComponentInChildren<Renderer>();
                var resTerm1 = CreateBindingPost("Term_1", resGo.transform, new Vector3(-0.018f, 0.047f, 0), matBrass, null, Wiring.TerminalId.Resistor_Term1, "Resistor Term 1");
                var resTerm2 = CreateBindingPost("Term_2", resGo.transform, new Vector3( 0.018f, 0.047f, 0), matBrass, null, Wiring.TerminalId.Resistor_Term2, "Resistor Term 2");
            }
            else
            {
                CreateBox("BasePlate", resGo.transform, new Vector3(0, 0.01f, 0), new Vector3(0.12f, 0.02f, 0.09f), matOak);
                var spool = CreateCylinder("SpoolWinding", resGo.transform, new Vector3(0, 0.045f, 0), new Vector3(0.055f, 0.025f, 0.055f), Quaternion.identity, matCopper);
                refs.ResistorRenderer = spool.GetComponent<Renderer>();
                var resTerm1 = CreateBindingPost("Term_1", resGo.transform, new Vector3(-0.04f, 0.03f, 0), matBrass, null, Wiring.TerminalId.Resistor_Term1, "Resistor Term 1");
                var resTerm2 = CreateBindingPost("Term_2", resGo.transform, new Vector3( 0.04f, 0.03f, 0), matBrass, null, Wiring.TerminalId.Resistor_Term2, "Resistor Term 2");
            }

            // ── 6. ANALOG VOLTMETER (Right Back: x = 0.52m, z = 3.05m) ────────
            Vector3 voltPos = new Vector3(0.52f, tableY, 3.05f);
            var voltGo = BuildMeter("Voltmeter", voltPos, Quaternion.Euler(0, -18f, 0), root, matVoltmeterDial, matEbonite, matGlass, matNeedle, matBrass,
                Wiring.TerminalId.Voltmeter_Pos, Wiring.TerminalId.Voltmeter_Neg);
            refs.VoltmeterNeedle = voltGo.transform.Find("FaceAssembly/NeedlePivot");

            // ── 7. CABLE ORGANIZER TRAY & STUDENT WIRING MANAGER ───────────────
            BuildCableTray(root, new Vector3(-0.70f, tableY, 2.65f), matOak, matMetalTrim);

            var wiringRoot = new GameObject("CircuitWiring");
            wiringRoot.transform.SetParent(root);

            wiringRoot.AddComponent<Wiring.InteractiveWiringManager>();
            // Auto-wiring is deferred to InteractiveWiringManager.Start() to ensure all
            // BindingPost components are fully initialized before FindObjectsByType is called.

            return refs;
        }

        // ── Analog Meter Housing Builder ──────────────────────────────────────

        private static GameObject BuildMeter(string name, Vector3 pos, Quaternion rot, Transform parent,
            Material dialMat, Material caseMat, Material glassMat, Material needleMat, Material brassMat,
            Wiring.TerminalId posId, Wiring.TerminalId negId)
        {
            var meter = new GameObject(name);
            meter.transform.SetParent(parent);
            meter.transform.position = pos;
            meter.transform.rotation = rot;

            // BoxCollider for mouse/raycast interaction
            var col = meter.AddComponent<BoxCollider>();
            col.center = new Vector3(0, 0.05f, 0);
            col.size = new Vector3(0.16f, 0.10f, 0.14f);

            var modelPrefab = Resources.Load<GameObject>($"Models/Equipment/{name}_Lab_Pro");
            var needlePrefab = Resources.Load<GameObject>($"Models/Equipment/{name}_Needle");

            if (modelPrefab != null)
            {
                var bodyInst = Object.Instantiate(modelPrefab, meter.transform);
                bodyInst.name = "ProMesh";
                bodyInst.transform.localPosition = Vector3.zero;
                bodyInst.transform.localRotation = Quaternion.identity;

                var matBezel = VisoraLabMaterials.GetMaterial("Lab_Bezel");
                var matMirror = VisoraLabMaterials.GetMaterial("Lab_MirrorStrip");
                var matTermRed = VisoraLabMaterials.GetMaterial("Lab_TerminalRed");
                var matTermBlack = VisoraLabMaterials.GetMaterial("Lab_TerminalBlack");
                var matMetalTrim = VisoraLabMaterials.GetMaterial("Lab_MetalTrim");

                var rends = bodyInst.GetComponentsInChildren<Renderer>();
                foreach (var r in rends)
                {
                    var mats = r.sharedMaterials;
                    for (int m = 0; m < mats.Length; m++)
                    {
                        if (mats[m] != null)
                        {
                            string mName = mats[m].name;
                            if (mName.Contains("DialPlate") || mName.Contains("Dial")) mats[m] = dialMat;
                            else if (mName.Contains("Glass")) mats[m] = glassMat;
                            else if (mName.Contains("Brass")) mats[m] = brassMat;
                            else if (mName.Contains("Bakelite")) mats[m] = caseMat;
                            else if (mName.Contains("Bezel")) mats[m] = matBezel;
                            else if (mName.Contains("Mirror")) mats[m] = matMirror;
                            else if (mName.Contains("TerminalRed")) mats[m] = matTermRed;
                            else if (mName.Contains("TerminalBlack")) mats[m] = matTermBlack;
                        }
                    }
                    r.sharedMaterials = mats;
                }

                var faceAssembly = new GameObject("FaceAssembly");
                faceAssembly.transform.SetParent(meter.transform);
                faceAssembly.transform.localPosition = new Vector3(0f, 0.0518f, -0.0230f);
                faceAssembly.transform.localRotation = Quaternion.LookRotation(new Vector3(0f, 0.90035f, -0.43517f), new Vector3(0f, 0.43517f, 0.90035f));

                var needlePivot = new GameObject("NeedlePivot");
                needlePivot.transform.SetParent(faceAssembly.transform);
                needlePivot.transform.localPosition = Vector3.zero;
                needlePivot.transform.localRotation = Quaternion.identity;

                if (needlePrefab != null)
                {
                    var needleInst = Object.Instantiate(needlePrefab, needlePivot.transform);
                    needleInst.name = "NeedleMesh";
                    needleInst.transform.localPosition = Vector3.zero;
                    needleInst.transform.localRotation = Quaternion.identity;

                    var nRends = needleInst.GetComponentsInChildren<Renderer>();
                    foreach (var nr in nRends)
                    {
                        var nMats = nr.sharedMaterials;
                        for (int m = 0; m < nMats.Length; m++)
                        {
                            if (nMats[m] != null)
                            {
                                string nmName = nMats[m].name;
                                if (nmName.Contains("NeedleRed") || nmName.Contains("Red")) nMats[m] = needleMat;
                                else if (nmName.Contains("Brass")) nMats[m] = brassMat;
                                else if (nmName.Contains("Hub") || nmName.Contains("NeedleHub")) nMats[m] = matMetalTrim;
                            }
                        }
                        nr.sharedMaterials = nMats;
                    }
                }
                else
                {
                    CreateBox("Pointer", needlePivot.transform, new Vector3(0, 0.028f, 0), new Vector3(0.003f, 0.056f, 0.002f), needleMat);
                }

                // Interactive Binding Posts
                CreateBindingPost("Term_Positive", meter.transform, new Vector3( 0.042f, 0.030f, -0.048f), brassMat, Color.red, posId, $"{name} (+)");
                CreateBindingPost("Term_Negative", meter.transform, new Vector3(-0.042f, 0.030f, -0.048f), brassMat, Color.black, negId, $"{name} (-)");

                if (name == "Voltmeter")
                {
                    meter.AddComponent<VoltmeterDevice>();
                    meter.AddComponent<VoltmeterInspectUI>();
                }

                return meter;
            }

            // Fallback to procedural primitives if model asset is missing
            CreateBox("BaseCase", meter.transform, new Vector3(0, 0.025f, 0), new Vector3(0.16f, 0.05f, 0.13f), caseMat);

            var facePivot = new GameObject("FaceAssembly");
            facePivot.transform.SetParent(meter.transform);
            facePivot.transform.localPosition = new Vector3(0, 0.05f, 0.01f);
            facePivot.transform.localRotation = Quaternion.Euler(40f, 0, 0);

            CreateBox("DialBacking", facePivot.transform, new Vector3(0, 0.045f, 0), new Vector3(0.145f, 0.10f, 0.02f), caseMat);
            CreateQuad("DialPlate", facePivot.transform, new Vector3(0, 0.045f, -0.011f), new Vector3(0.135f, 0.09f, 1f), Quaternion.identity, dialMat);

            var fallbackNeedlePivot = new GameObject("NeedlePivot");
            fallbackNeedlePivot.transform.SetParent(facePivot.transform);
            fallbackNeedlePivot.transform.localPosition = new Vector3(0f, 0.012f, -0.014f);
            fallbackNeedlePivot.transform.localRotation = Quaternion.identity;

            CreateBox("Pointer", fallbackNeedlePivot.transform, new Vector3(0, 0.028f, 0), new Vector3(0.003f, 0.056f, 0.002f), needleMat);
            CreateCylinder("Cap", fallbackNeedlePivot.transform, Vector3.zero, new Vector3(0.014f, 0.005f, 0.014f), Quaternion.Euler(90f, 0, 0), brassMat);

            CreateBindingPost("Term_Positive", meter.transform, new Vector3(-0.05f, 0.055f, -0.05f), brassMat, Color.red, posId, $"{name} (+)");
            CreateBindingPost("Term_Negative", meter.transform, new Vector3( 0.05f, 0.055f, -0.05f), brassMat, Color.black, negId, $"{name} (-)");

            return meter;
        }

        // ── Cable Storage Tray Builder ─────────────────────────────────────────

        private static void BuildCableTray(Transform parent, Vector3 localPos, Material woodMat, Material metalMat)
        {
            var tray = new GameObject("CableTray");
            tray.transform.SetParent(parent);
            tray.transform.localPosition = localPos;

            // Base plate
            CreateBox("TrayBase", tray.transform, new Vector3(0, 0.01f, 0), new Vector3(0.24f, 0.02f, 0.16f), woodMat);
            // Tray rim borders
            CreateBox("RimLeft", tray.transform, new Vector3(-0.115f, 0.025f, 0), new Vector3(0.01f, 0.025f, 0.16f), woodMat);
            CreateBox("RimRight", tray.transform, new Vector3(0.115f, 0.025f, 0), new Vector3(0.01f, 0.025f, 0.16f), woodMat);
            CreateBox("RimBack", tray.transform, new Vector3(0, 0.025f, 0.075f), new Vector3(0.24f, 0.025f, 0.01f), woodMat);
            CreateBox("RimFront", tray.transform, new Vector3(0, 0.025f, -0.075f), new Vector3(0.24f, 0.025f, 0.01f), woodMat);

            // Interior dividers
            CreateBox("Divider1", tray.transform, new Vector3(-0.04f, 0.02f, 0), new Vector3(0.008f, 0.015f, 0.14f), woodMat);
            CreateBox("Divider2", tray.transform, new Vector3( 0.04f, 0.02f, 0), new Vector3(0.008f, 0.015f, 0.14f), woodMat);

            // Visual jumper cable coils in tray
            var redMat = new Material(VisoraLabMaterials.LitShader);
            redMat.SetColor("_BaseColor", new Color(0.9f, 0.15f, 0.15f));
            CreateCylinder("CoiledCable_Red", tray.transform, new Vector3(-0.075f, 0.022f, 0), new Vector3(0.05f, 0.015f, 0.10f), Quaternion.identity, redMat);

            var blackMat = new Material(VisoraLabMaterials.LitShader);
            blackMat.SetColor("_BaseColor", new Color(0.12f, 0.12f, 0.14f));
            CreateCylinder("CoiledCable_Black", tray.transform, new Vector3(0f, 0.022f, 0), new Vector3(0.05f, 0.015f, 0.10f), Quaternion.identity, blackMat);

            var yellowMat = new Material(VisoraLabMaterials.LitShader);
            yellowMat.SetColor("_BaseColor", new Color(0.95f, 0.75f, 0.1f));
            CreateCylinder("CoiledCable_Yellow", tray.transform, new Vector3(0.075f, 0.022f, 0), new Vector3(0.05f, 0.015f, 0.10f), Quaternion.identity, yellowMat);
        }

        // ── Curved Connecting Wire Builder ────────────────────────────────────

        public static GameObject BuildWire(string name, Transform parent, Vector3 start, Vector3 end, float radius, Material wireMat, float sag = 0.04f)
        {
            var wireGo = new GameObject(name);
            wireGo.transform.SetParent(parent);

            int segments = 12;
            Vector3[] points = new Vector3[segments + 1];

            // Catenary / quadratic Bézier sag
            Vector3 mid = (start + end) * 0.5f + Vector3.down * sag;

            for (int i = 0; i <= segments; i++)
            {
                float t = i / (float)segments;
                points[i] = (1 - t) * (1 - t) * start + 2 * (1 - t) * t * mid + t * t * end;
            }

            for (int i = 0; i < segments; i++)
            {
                Vector3 p1 = points[i];
                Vector3 p2 = points[i + 1];
                Vector3 dir = p2 - p1;
                float len = dir.magnitude;
                if (len < 0.0001f) continue;

                var seg = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                seg.name = $"Seg_{i}";
                seg.transform.SetParent(wireGo.transform);
                seg.transform.position = (p1 + p2) * 0.5f;
                seg.transform.localScale = new Vector3(radius * 2f, len * 0.5f, radius * 2f);
                seg.transform.up = dir.normalized;
                SafeDestroy(seg.GetComponent<Collider>());

                if (wireMat != null) seg.GetComponent<Renderer>().material = wireMat;
            }

            return wireGo;
        }

        // ── Primitive Utilities ───────────────────────────────────────────────

        private static Transform CreateBindingPost(string name, Transform parent, Vector3 localPos, Material mat, Color? ringColor = null,
            Wiring.TerminalId? terminalId = null, string friendlyName = null)
        {
            var post = new GameObject(name);
            post.transform.SetParent(parent);
            post.transform.localPosition = localPos;

            CreateCylinder("Post", post.transform, new Vector3(0, 0.012f, 0), new Vector3(0.014f, 0.012f, 0.014f), Quaternion.identity, mat);
            CreateCylinder("Nut", post.transform, new Vector3(0, 0.022f, 0), new Vector3(0.018f, 0.008f, 0.018f), Quaternion.identity, mat);

            if (ringColor.HasValue)
            {
                var ringMat = new Material(VisoraLabMaterials.LitShader);
                ringMat.SetColor("_BaseColor", ringColor.Value);
                CreateCylinder("ColorCollar", post.transform, new Vector3(0, 0.003f, 0), new Vector3(0.020f, 0.004f, 0.020f), Quaternion.identity, ringMat);
            }

            if (terminalId.HasValue)
            {
                var bp = post.AddComponent<Wiring.BindingPost>();
                Color col = ringColor.HasValue ? ringColor.Value : new Color(0.92f, 0.76f, 0.35f);
                bp.Configure(terminalId.Value, !string.IsNullOrEmpty(friendlyName) ? friendlyName : name, col, post.transform);

                var sphereCol = post.AddComponent<SphereCollider>();
                sphereCol.center = new Vector3(0, 0.015f, 0);
                sphereCol.radius = 0.025f;
            }

            return post.transform;
        }

        private static GameObject CreateBox(string name, Transform parent, Vector3 localPos, Vector3 size, Material mat)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.SetParent(parent);
            go.transform.localPosition = localPos;
            go.transform.localScale = size;
            SafeDestroy(go.GetComponent<Collider>());
            if (mat != null) go.GetComponent<Renderer>().material = mat;
            return go;
        }

        private static GameObject CreateCylinder(string name, Transform parent, Vector3 localPos, Vector3 scale, Quaternion localRot, Material mat)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            go.name = name;
            go.transform.SetParent(parent);
            go.transform.localPosition = localPos;
            go.transform.localRotation = localRot;
            go.transform.localScale = scale;
            SafeDestroy(go.GetComponent<Collider>());
            if (mat != null) go.GetComponent<Renderer>().material = mat;
            return go;
        }

        private static GameObject CreateQuad(string name, Transform parent, Vector3 localPos, Vector3 scale, Quaternion localRot, Material mat)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Quad);
            go.name = name;
            go.transform.SetParent(parent);
            go.transform.localPosition = localPos;
            go.transform.localRotation = localRot;
            go.transform.localScale = scale;
            SafeDestroy(go.GetComponent<Collider>());
            if (mat != null) go.GetComponent<Renderer>().material = mat;
            return go;
        }

        private static void SafeDestroy(Object obj)
        {
            if (obj == null) return;
            if (Application.isPlaying) Object.Destroy(obj);
            else Object.DestroyImmediate(obj);
        }
    }
}
