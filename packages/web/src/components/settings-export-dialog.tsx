/**
 * =============================================================================
 * Settings Export Dialog
 * =============================================================================
 *
 * Dialog that generates copyable Three.js code reflecting the current editor
 * settings — material, geometry, lighting, camera, and animation — so
 * developers can recreate the look in any Three.js project. Also supports
 * importing pasted Three.js settings to update the editor state.
 */

"use client";

import { useState, useMemo } from "react";
import { Check, Copy, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MaterialSettings, MaterialPreset } from "@/lib/types";
import { materialPresets } from "@/lib/types";
import type { LightSettings } from "@/components/svg-to-3d-canvas";
import { defaultLightSettings } from "@/components/svg-to-3d-canvas";
import type { AnimationType } from "thicc-svg";

export interface ParsedSettings {
  color?: string;
  bgColor?: string;
  materialSettings?: Partial<MaterialSettings>;
  depth?: number;
  smoothness?: number;
  rotationX?: number;
  rotationY?: number;
  zoom?: number;
  lightSettings?: Partial<LightSettings>;
  animate?: AnimationType;
  animateSpeed?: number;
  animateReverse?: boolean;
}

interface SettingsExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depth: number;
  smoothness: number;
  color: string;
  bgColor: string;
  materialSettings: MaterialSettings;
  textureUrl: string | null;
  animate: AnimationType;
  animateSpeed: number;
  animateReverse: boolean;
  rotationX: number;
  rotationY: number;
  zoom: number;
  lightSettings: LightSettings;
  onImport?: (settings: ParsedSettings) => void;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function generateThreeJSCode(props: SettingsExportDialogProps): string {
  const lines: string[] = [];

  lines.push(`// Three.js Settings — exported from thicc-svg.design`);
  lines.push(`// Paste into any Three.js project to recreate this look.`);
  lines.push(``);
  lines.push(`import * as THREE from "three";`);
  lines.push(``);

  // --- Material ---
  const m = props.materialSettings;
  const isGold = m.preset === "gold";
  const isEmissive = m.preset === "emissive";
  const wantsTransparency = m.transparent || m.opacity < 1;
  const baseColor = isGold ? "#d4a017" : props.color;
  const emissiveColor = isEmissive ? props.color : "#000000";

  lines.push(`// Material (preset: "${m.preset}")`);
  lines.push(`const material = new THREE.MeshPhysicalMaterial({`);
  lines.push(`  color: new THREE.Color("${baseColor}"),`);
  lines.push(`  metalness: ${m.metalness},`);
  lines.push(
    `  roughness: ${wantsTransparency ? round(Math.max(0.02, m.roughness * 0.3)) : m.roughness},`,
  );
  if (wantsTransparency) {
    lines.push(`  transmission: ${round(1 - m.opacity)},`);
    lines.push(`  thickness: 2.5,`);
    lines.push(`  ior: 1.5,`);
  }
  if (m.wireframe) lines.push(`  wireframe: true,`);
  if (isEmissive) {
    lines.push(`  emissive: new THREE.Color("${emissiveColor}"),`);
    lines.push(`  emissiveIntensity: 0.8,`);
  }
  if (wantsTransparency) {
    lines.push(`  clearcoat: 1,`);
  }
  lines.push(`  clearcoatRoughness: 0.05,`);
  lines.push(`  side: THREE.FrontSide,`);
  lines.push(`  envMapIntensity: 1,`);
  lines.push(`});`);

  if (props.textureUrl) {
    lines.push(``);
    lines.push(`// Texture`);
    lines.push(`const textureLoader = new THREE.TextureLoader();`);
    lines.push(`const texture = textureLoader.load("${props.textureUrl}");`);
    lines.push(`texture.wrapS = THREE.RepeatWrapping;`);
    lines.push(`texture.wrapT = THREE.RepeatWrapping;`);
    lines.push(`texture.colorSpace = THREE.SRGBColorSpace;`);
    lines.push(`material.map = texture;`);
    lines.push(`material.color.set("#ffffff"); // neutral base when textured`);
  }

  // --- Geometry ---
  lines.push(``);
  lines.push(`// Geometry (extrude your SVG shapes with these settings)`);
  lines.push(`const extrudeSettings = {`);
  lines.push(`  depth: ${round(props.depth / 10)}, // scaled by shape size`);
  lines.push(`  bevelEnabled: true,`);
  lines.push(
    `  bevelThickness: ${round(0.15 + props.smoothness * 0.2)}, // × bevelScale`,
  );
  lines.push(
    `  bevelSize: ${round(0.15 + props.smoothness * 0.2)}, // × bevelScale`,
  );
  lines.push(`  bevelSegments: ${Math.round(3 + props.smoothness * 20)},`);
  lines.push(`  curveSegments: ${Math.round(24 + props.smoothness * 176)},`);
  lines.push(`};`);
  lines.push(`// bevelScale = Math.min(maxFlatDim * 0.02, 1)`);
  lines.push(`// scaledDepth = extrudeSettings.depth * maxFlatDim`);

  // --- Camera ---
  lines.push(``);
  lines.push(`// Camera`);
  lines.push(
    `const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);`,
  );
  lines.push(`camera.position.set(0, 0, ${props.zoom});`);

  // --- Rotation ---
  if (props.rotationX !== 0 || props.rotationY !== 0) {
    lines.push(``);
    lines.push(`// Rotation`);
    lines.push(`mesh.rotation.x = ${round(props.rotationX)};`);
    lines.push(`mesh.rotation.y = ${round(props.rotationY)};`);
  }

  // --- Lighting ---
  const ls = props.lightSettings;
  lines.push(``);
  lines.push(`// Lighting`);
  lines.push(
    `const ambientLight = new THREE.AmbientLight(0xffffff, ${ls.ambientIntensity});`,
  );
  lines.push(`scene.add(ambientLight);`);
  lines.push(``);
  lines.push(
    `const keyLight = new THREE.DirectionalLight(0xffffff, ${ls.keyIntensity});`,
  );
  lines.push(`keyLight.position.set(${ls.keyX}, ${ls.keyY}, ${ls.keyZ});`);
  lines.push(`keyLight.castShadow = true;`);
  lines.push(`scene.add(keyLight);`);
  lines.push(``);
  lines.push(`const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);`);
  lines.push(`fillLight.position.set(-5, 3, -3);`);
  lines.push(`scene.add(fillLight);`);
  lines.push(``);
  lines.push(`const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);`);
  lines.push(`rimLight.position.set(0, -4, 6);`);
  lines.push(`scene.add(rimLight);`);
  lines.push(``);
  lines.push(`const topLight = new THREE.PointLight(0xffffff, 0.3);`);
  lines.push(`topLight.position.set(0, 5, 0);`);
  lines.push(`scene.add(topLight);`);
  lines.push(``);
  lines.push(
    `const hemiLight = new THREE.HemisphereLight("#b1e1ff", "#b97a20", 0.5);`,
  );
  lines.push(`scene.add(hemiLight);`);

  // --- Environment ---
  lines.push(``);
  lines.push(`// Environment`);
  lines.push(`scene.background = new THREE.Color("#0a0a0a");`);
  lines.push(``);
  lines.push(`// Background plane (gives glass/transmission materials something to refract)`);
  lines.push(`const bgPlane = new THREE.Mesh(`);
  lines.push(`  new THREE.PlaneGeometry(100, 100),`);
  lines.push(`  new THREE.MeshStandardMaterial({ color: "${props.bgColor}", roughness: 0.8, metalness: 0 })`);
  lines.push(`);`);
  lines.push(`bgPlane.position.set(0, 0, -3);`);
  lines.push(`bgPlane.receiveShadow = true;`);
  lines.push(`scene.add(bgPlane);`);
  if (props.lightSettings.shadowEnabled) {
    lines.push(``);
    lines.push(`// Contact shadows (approximation — use shadow maps or baked AO in vanilla Three.js)`);
    lines.push(`// Position: [0, -3, 0], opacity: 0.4, scale: 10, blur: 2, far: 4`);
  }
  lines.push(``);
  lines.push(`// Custom environment cubemap (soft studio lighting)`);
  lines.push(`// Dome: #0a0a12, Top fill: #ffffff at [0,25,0] r=20,`);
  lines.push(`// Front fill: #444444 at [0,0,30] r=15, Side fill: #333333 at [-20,5,10] r=10`);

  // --- Renderer ---
  lines.push(``);
  lines.push(`// Renderer`);
  lines.push(`renderer.toneMapping = THREE.ACESFilmicToneMapping;`);
  lines.push(`renderer.toneMappingExposure = 1.2;`);

  // --- Animation ---
  if (props.animate !== "none") {
    lines.push(``);
    lines.push(
      `// Animation: "${props.animate}" (speed: ${props.animateSpeed}${props.animateReverse ? ", reversed" : ""})`,
    );

    const dir = props.animateReverse ? -1 : 1;
    const spd = props.animateSpeed;

    switch (props.animate) {
      case "spin":
        lines.push(`// Rotate the mesh each frame:`);
        lines.push(
          `mesh.rotation.y += ${round(0.01 * spd * dir)}; // per frame`,
        );
        break;
      case "float":
        lines.push(`// Float up and down with a sine wave:`);
        lines.push(`const floatSpeed = ${round(1.5 * spd)};`);
        lines.push(`const floatAmplitude = 0.15;`);
        lines.push(
          `mesh.position.y = Math.sin(elapsed * floatSpeed) * floatAmplitude${dir === -1 ? " * -1" : ""};`,
        );
        lines.push(
          `mesh.rotation.x = Math.sin(elapsed * floatSpeed * 0.5) * 0.05;`,
        );
        break;
      case "pulse":
        lines.push(`// Pulse scale with a sine wave:`);
        lines.push(`const pulseSpeed = ${round(2 * spd)};`);
        lines.push(`const scale = 1 + Math.sin(elapsed * pulseSpeed) * 0.05;`);
        lines.push(`mesh.scale.set(scale, scale, scale);`);
        break;
      case "wobble":
        lines.push(`// Wobble rotation on X and Z:`);
        lines.push(`const wobbleSpeed = ${round(2 * spd)};`);
        lines.push(`mesh.rotation.x = Math.sin(elapsed * wobbleSpeed) * 0.1;`);
        lines.push(
          `mesh.rotation.z = Math.cos(elapsed * wobbleSpeed * 0.7) * 0.08;`,
        );
        break;
      case "spinFloat":
        lines.push(`// Spin + float combined:`);
        lines.push(
          `mesh.rotation.y += ${round(0.008 * spd * dir)}; // per frame`,
        );
        lines.push(
          `mesh.position.y = Math.sin(elapsed * ${round(1.2 * spd)}) * 0.12;`,
        );
        break;
      case "swing":
        lines.push(`// Pendulum swing on Z axis:`);
        lines.push(`const swingSpeed = ${round(1.5 * spd)};`);
        lines.push(
          `mesh.rotation.z = Math.sin(elapsed * swingSpeed) * 0.15${dir === -1 ? " * -1" : ""};`,
        );
        break;
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Parser — extract settings from pasted Three.js code
// ---------------------------------------------------------------------------

const VALID_ANIMATIONS: AnimationType[] = [
  "none",
  "spin",
  "float",
  "pulse",
  "wobble",
  "spinFloat",
  "swing",
];

function findPresetByValues(
  metalness: number,
  roughness: number,
  opacity: number,
): MaterialPreset {
  for (const [key, preset] of Object.entries(materialPresets)) {
    if (
      preset.metalness === metalness &&
      preset.roughness === roughness &&
      preset.opacity === opacity
    ) {
      return key as MaterialPreset;
    }
  }
  // Closest match by metalness + roughness
  let best: MaterialPreset = "default";
  let bestDist = Infinity;
  for (const [key, preset] of Object.entries(materialPresets)) {
    const dist =
      Math.abs(preset.metalness - metalness) +
      Math.abs(preset.roughness - roughness);
    if (dist < bestDist) {
      bestDist = dist;
      best = key as MaterialPreset;
    }
  }
  return best;
}

function parseThreeJSCode(code: string): ParsedSettings {
  const result: ParsedSettings = {};

  // --- Material preset from comment ---
  const presetMatch = code.match(/Material \(preset: "([^"]+)"\)/);
  const parsedPreset = presetMatch?.[1] as MaterialPreset | undefined;

  // --- Color ---
  const colorMatch = code.match(
    /color:\s*new\s+THREE\.Color\(\s*"([^"]+)"\s*\)/,
  );
  if (colorMatch) {
    const parsedColor = colorMatch[1];
    // Gold preset uses #d4a017 internally — don't override editor color
    if (parsedPreset !== "gold") {
      result.color = parsedColor;
    }
  }

  // --- Material properties ---
  const metalnessMatch = code.match(/metalness:\s*([\d.]+)/);
  const roughnessMatch = code.match(/roughness:\s*([\d.]+)/);
  const transmissionMatch = code.match(/transmission:\s*([\d.]+)/);
  const wireframeMatch = code.match(/wireframe:\s*true/);

  const metalness = metalnessMatch ? parseFloat(metalnessMatch[1]) : undefined;
  const roughness = roughnessMatch ? parseFloat(roughnessMatch[1]) : undefined;
  const transmission = transmissionMatch
    ? parseFloat(transmissionMatch[1])
    : undefined;
  const opacity = transmission !== undefined ? round(1 - transmission) : 1;
  const wireframe = !!wireframeMatch;

  if (metalness !== undefined || roughness !== undefined) {
    const preset =
      parsedPreset && parsedPreset in materialPresets
        ? parsedPreset
        : findPresetByValues(metalness ?? 0.15, roughness ?? 0.35, opacity);

    const presetData = materialPresets[preset];
    result.materialSettings = {
      preset,
      metalness: metalness ?? presetData.metalness,
      roughness: roughness ?? presetData.roughness,
      opacity,
      transparent: presetData.transparent || opacity < 1,
      wireframe,
    };
  }

  // --- Geometry ---
  const depthMatch = code.match(/depth:\s*([\d.]+)/);
  if (depthMatch) {
    result.depth = round(parseFloat(depthMatch[1]) * 10);
  }

  // Reverse-engineer smoothness from bevelSegments
  const bevelSegmentsMatch = code.match(/bevelSegments:\s*(\d+)/);
  if (bevelSegmentsMatch) {
    const bevelSegments = parseInt(bevelSegmentsMatch[1]);
    // bevelSegments = Math.round(3 + smoothness * 20)
    result.smoothness = round(Math.max(0, (bevelSegments - 3) / 20));
  }

  // --- Camera ---
  const cameraMatch = code.match(
    /camera\.position\.set\(\s*[\d.\-]+,\s*[\d.\-]+,\s*([\d.\-]+)\s*\)/,
  );
  if (cameraMatch) {
    result.zoom = parseFloat(cameraMatch[1]);
  }

  // --- Rotation ---
  const rotXMatch = code.match(/mesh\.rotation\.x\s*=\s*([\d.\-]+)/);
  const rotYStaticMatch = code.match(/mesh\.rotation\.y\s*=\s*([\d.\-]+)/);
  if (rotXMatch) result.rotationX = parseFloat(rotXMatch[1]);
  if (rotYStaticMatch) result.rotationY = parseFloat(rotYStaticMatch[1]);

  // --- Lighting ---
  const ambientMatch = code.match(/AmbientLight\(\s*0xffffff,\s*([\d.]+)/);
  const keyIntensityMatch = code.match(
    /keyLight\s*=\s*new\s+THREE\.DirectionalLight\(\s*0xffffff,\s*([\d.]+)/,
  );
  const keyPosMatch = code.match(
    /keyLight\.position\.set\(\s*([\d.\-]+),\s*([\d.\-]+),\s*([\d.\-]+)\s*\)/,
  );

  if (ambientMatch || keyIntensityMatch || keyPosMatch) {
    result.lightSettings = {};
    if (ambientMatch)
      result.lightSettings.ambientIntensity = parseFloat(ambientMatch[1]);
    if (keyIntensityMatch)
      result.lightSettings.keyIntensity = parseFloat(keyIntensityMatch[1]);
    if (keyPosMatch) {
      result.lightSettings.keyX = parseFloat(keyPosMatch[1]);
      result.lightSettings.keyY = parseFloat(keyPosMatch[2]);
      result.lightSettings.keyZ = parseFloat(keyPosMatch[3]);
    }
  }

  // --- Environment / Background ---
  const bgColorMatch = code.match(
    /MeshStandardMaterial\(\{\s*color:\s*"([^"]+)",\s*roughness:\s*0\.8,\s*metalness:\s*0/,
  );
  if (bgColorMatch) {
    result.bgColor = bgColorMatch[1];
  }

  // Shadow enabled
  const shadowMatch = code.match(/Contact shadows/);
  if (shadowMatch) {
    if (!result.lightSettings) result.lightSettings = {};
    result.lightSettings.shadowEnabled = true;
  }

  // --- Animation ---
  const animMatch = code.match(/Animation:\s*"([^"]+)"/);
  if (animMatch && VALID_ANIMATIONS.includes(animMatch[1] as AnimationType)) {
    result.animate = animMatch[1] as AnimationType;
  }

  const speedMatch = code.match(/speed:\s*([\d.]+)/);
  if (speedMatch) result.animateSpeed = parseFloat(speedMatch[1]);

  if (code.includes("reversed")) result.animateReverse = true;

  return result;
}

function formatCode(code: string) {
  return code.split("\n").map((line, i) => (
    <span key={i} className="block">
      <span className="inline-block w-7 text-right mr-4 text-white/20 select-none">
        {i + 1}
      </span>
      {colorize(line)}
    </span>
  ));
}

function colorize(line: string): React.ReactNode {
  // Comments
  if (line.trimStart().startsWith("//")) {
    return <span className="text-emerald-400/60">{line}</span>;
  }
  // import lines
  if (line.startsWith("import")) {
    return <span className="text-purple-300/80">{line}</span>;
  }
  return line;
}

export function SettingsExportDialog(props: SettingsExportDialogProps) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"export" | "import">("export");
  const [importCode, setImportCode] = useState("");
  const [importApplied, setImportApplied] = useState(false);

  const code = useMemo(
    () => generateThreeJSCode(props),
    [
      props.depth,
      props.smoothness,
      props.color,
      props.bgColor,
      props.materialSettings,
      props.textureUrl,
      props.animate,
      props.animateSpeed,
      props.animateReverse,
      props.rotationX,
      props.rotationY,
      props.zoom,
      props.lightSettings,
    ],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    if (!importCode.trim() || !props.onImport) return;
    const parsed = parseThreeJSCode(importCode);
    props.onImport(parsed);
    setImportApplied(true);
    setTimeout(() => setImportApplied(false), 2000);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card/70 backdrop-blur-xl border-white/[0.06] shadow-[0_8px_32px_oklch(0_0_0/0.4)]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Three.js Settings
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-white/[0.04] p-1">
          <button
            type="button"
            onClick={() => setTab("export")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "export"
                ? "bg-white/[0.1] text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            type="button"
            onClick={() => setTab("import")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "import"
                ? "bg-white/[0.1] text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Import
          </button>
        </div>

        {tab === "export" ? (
          <>
            <p className="text-xs text-muted-foreground">
              Copy these settings into any Three.js project to recreate this
              look.
            </p>

            <div className="rounded-lg border border-white/[0.1] bg-black/70 overflow-hidden min-w-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.15]">
                <span className="text-[11px] text-white/40 font-mono">
                  scene-settings.js
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white/40 hover:text-white/70 hover:bg-white/5"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <pre className="p-4 text-[11px] leading-relaxed font-mono overflow-auto max-h-80 whitespace-pre w-0 min-w-full">
                {formatCode(code)}
              </pre>
            </div>

            <Button onClick={handleCopy} className="w-full gap-2 mt-2">
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy to clipboard"}
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Paste exported Three.js settings to apply them to the editor.
            </p>

            <textarea
              value={importCode}
              onChange={(e) => {
                setImportCode(e.target.value);
                setImportApplied(false);
              }}
              placeholder="Paste Three.js settings code here..."
              className="w-full h-56 rounded-lg border border-white/[0.1] bg-black/70 p-4 text-[11px] leading-relaxed font-mono text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/20"
              spellCheck={false}
            />

            <Button
              onClick={handleImport}
              disabled={!importCode.trim() || !props.onImport}
              className="w-full gap-2 mt-2"
            >
              {importApplied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {importApplied ? "Settings applied!" : "Apply settings"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
