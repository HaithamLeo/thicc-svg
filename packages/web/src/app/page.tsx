/**
 * =============================================================================
 * Editor Page
 * =============================================================================
 *
 * Main application page. Composes the 3D canvas, input panel, controls
 * panel, and export bar into the full editor experience.
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Settings2,
  CodeXml,
  MessageCircle,
  Download,
  Braces,
  MoreHorizontal,
} from "lucide-react";
import {
  defaultLightSettings,
  type LightSettings,
  type Export3DFormat,
} from "@/components/svg-to-3d-canvas";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { InputPanel } from "@/components/input-panel";
import { ControlsPanel } from "@/components/controls-panel";
import { ExportModal } from "@/components/export-bar";
import { EmbedDialog } from "@/components/embed-dialog";
import { DownloadDialog } from "@/components/download-dialog";
import {
  SettingsExportDialog,
  type ParsedSettings,
} from "@/components/settings-export-dialog";
import { Freedback } from "@/components/freedback";
import {
  defaultTextureSettings,
  defaultMaterialSettings,
  type TextureSettings,
  type MaterialSettings,
} from "@/lib/types";

const SVGTo3DCanvas = dynamic(
  () =>
    import("@/components/svg-to-3d-canvas").then((mod) => mod.SVGTo3DCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-muted rounded-lg animate-pulse" />
    ),
  },
);

export default function Home() {
  // --- Editor state ---
  const [customSvg, setCustomSvg] = useState("");
  const [fileSvg, setFileSvg] = useState("");
  const [pixelSvg, setPixelSvg] = useState("");
  const [textSvg, setTextSvg] = useState("");
  const [inputTab, setInputTab] = useState("draw");
  const [depth, setDepth] = useState(1);
  const [smoothness, setSmoothness] = useState(0.6);
  const [strokeScale, setStrokeScale] = useState(1);
  const [color, setColor] = useState("#808080");
  const [bgColor, setBgColor] = useState("#2d2d2d");
  const [textureUrl, setTextureUrl] = useState<string | null>(null);
  const [textureSettings, setTextureSettings] = useState<TextureSettings>(
    defaultTextureSettings,
  );
  const [materialSettings, setMaterialSettings] = useState<MaterialSettings>(
    defaultMaterialSettings,
  );
  const captureFnRef = useRef<
    | ((
        resolution: number,
        withBackground: boolean,
        onCapture: (dataUrl: string) => void,
        aspectRatio?: number | null,
      ) => void)
    | null
  >(null);
  const export3DFnRef = useRef<
    | ((format: Export3DFormat, filename?: string, meshOnly?: boolean) => void)
    | null
  >(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [topPanel, setTopPanel] = useState<"toolbar" | "settings">("toolbar");
  const [lightingOpen, setLightingOpen] = useState(false);
  const [cursorOrbit, setCursorOrbit] = useState(false);
  const [orbitStrength, setOrbitStrength] = useState(0.15);
  const [resetOnIdle, setResetOnIdle] = useState(false);
  const [resetDelay, setResetDelay] = useState(2);
  const [rotationX, setRotationX] = useState(0);
  const [rotationY, setRotationY] = useState(0);
  const [zoom, setZoom] = useState(8);
  const [resetKey, setResetKey] = useState(0);
  const [animate, setAnimate] = useState<
    "none" | "spin" | "float" | "pulse" | "wobble" | "spinFloat" | "swing"
  >("float");
  const [animateSpeed, setAnimateSpeed] = useState(1);
  const [animateReverse, setAnimateReverse] = useState(false);
  const [lightSettings, setLightSettings] =
    useState<LightSettings>(defaultLightSettings);
  const [currentText, setCurrentText] = useState("THICC-SVG");
  const [currentFont, setCurrentFont] = useState("Rubik Mono One");
  const [embedOpen, setEmbedOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [settingsExportOpen, setSettingsExportOpen] = useState(false);

  // --- Export bar ---
  const [exportOpen] = useState(true);
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const registerCapture = useCallback(
    (
      fn: (
        resolution: number,
        withBackground: boolean,
        onCapture: (dataUrl: string) => void,
        aspectRatio?: number | null,
      ) => void,
    ) => {
      captureFnRef.current = fn;
    },
    [],
  );

  const registerCanvas = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  const register3DExport = useCallback(
    (
      fn: (
        format: Export3DFormat,
        filename?: string,
        meshOnly?: boolean,
      ) => void,
    ) => {
      export3DFnRef.current = fn;
    },
    [],
  );

  const handle3DExport = useCallback(
    (format: Export3DFormat, meshOnly = false) => {
      const base =
        inputTab === "text" && currentText
          ? currentText.replace(/[^a-z0-9]+/gi, "-").toLowerCase() ||
            "thicc-svg"
          : "thicc-svg";
      const suffix = meshOnly ? "-mesh" : "";
      export3DFnRef.current?.(format, base + suffix, meshOnly);
    },
    [inputTab, currentText],
  );

  // --- Drag-and-drop SVG ---
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFile, setDroppedFile] = useState<{
    name: string;
    content: string;
  } | null>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current++;
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDragging(true);
      }
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) setIsDragging(false);
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const file = e.dataTransfer?.files[0];
      if (
        file &&
        (file.type === "image/svg+xml" || file.name.endsWith(".svg"))
      ) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          if (text) {
            setFileSvg(text);
            setInputTab("file");
            setDroppedFile({ name: file.name, content: text });
          }
        };
        reader.readAsText(file);
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  const handleTextureUpload = useCallback((url: string | null) => {
    setTextureUrl(url);
    if (!url) setTextureSettings(defaultTextureSettings);
  }, []);

  const handlePixelSvgChange = useCallback((svg: string) => {
    setPixelSvg(svg);
  }, []);

  const handleTextSvgChange = useCallback((svg: string) => {
    setTextSvg(svg);
  }, []);

  // Show SVG from the active tab. When switching to an empty tab,
  // keep showing the last non-empty SVG that was displayed.
  const svgByTab: Record<string, string> = {
    text: textSvg,
    draw: pixelSvg,
    code: customSvg.trim(),
    file: fileSvg,
  };
  const tabSvg = svgByTab[inputTab] ?? "";
  const [lastActiveSvg, setLastActiveSvg] = useState("");
  if (tabSvg && tabSvg !== lastActiveSvg) {
    setLastActiveSvg(tabSvg);
  }
  const activeSvg = tabSvg || lastActiveSvg;

  return (
    <main className="relative w-screen overflow-hidden bg-background h-[100svh]">
      {/* Layer 0: 3D Canvas */}
      <div className="absolute inset-0 z-0">
        <SVGTo3DCanvas
          svg={activeSvg}
          depth={depth}
          smoothness={smoothness}
          strokeScale={strokeScale}
          color={color}
          bgColor={bgColor}
          textureUrl={textureUrl}
          textureSettings={textureSettings}
          materialSettings={materialSettings}
          rotationX={rotationX}
          rotationY={rotationY}
          zoom={zoom}
          resetKey={resetKey}
          cursorOrbit={cursorOrbit}
          orbitStrength={orbitStrength}
          resetOnIdle={exportPreviewOpen ? false : resetOnIdle}
          resetDelay={resetDelay}
          animate={exportPreviewOpen ? "none" : animate}
          animateSpeed={animateSpeed}
          animateReverse={animateReverse}
          lightSettings={lightSettings}
          showLightHelper={controlsOpen && lightingOpen}
          registerCapture={registerCapture}
          registerCanvas={registerCanvas}
          register3DExport={register3DExport}
        />
      </div>

      {/* Layer 1: Ambient overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, oklch(0.25 0.12 185 / 0.06) 0%, transparent 55%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, oklch(0.03 0.03 250 / 0.7) 100%)",
        }}
      />
      {/* Subtle scan-line overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-[2] opacity-[0.015]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, oklch(1 0 0 / 0.5) 2px, oklch(1 0 0 / 0.5) 3px)",
        }}
      />

      {/* Layer 2: UI */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col p-5">
        {/* Left toolbar + content panel */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.2 }}
          className={`pointer-events-none relative ${topPanel === "toolbar" ? "z-20" : "z-[8]"}`}
        >
          <InputPanel
            inputTab={inputTab}
            onInputTabChange={(tab) => {
              setInputTab(tab);
              setTopPanel("toolbar");
            }}
            customSvg={customSvg}
            onCustomSvgChange={setCustomSvg}
            onFileSvgChange={setFileSvg}
            onPixelSvgChange={handlePixelSvgChange}
            onTextSvgChange={handleTextSvgChange}
            onTextChange={setCurrentText}
            onFontChange={setCurrentFont}
            initialText={currentText}
            initialFont={currentFont}
            droppedFile={droppedFile}
          />
        </motion.div>
      </div>

      {/* Top-right: primary actions + overflow menu */}
      <div
        className={`pointer-events-auto absolute top-5 right-5 flex items-center gap-2 ${topPanel === "settings" ? "z-[60]" : "z-[8]"}`}
      >
        {/* Overflow menu for secondary actions */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-card/70 backdrop-blur-2xl border border-primary/[0.1] shadow-[0_0_25px_oklch(0.78_0.2_185/0.06),0_8px_32px_oklch(0_0_0/0.5)] h-9 w-9 hover:border-primary/30 hover:shadow-[0_0_30px_oklch(0.78_0.2_185/0.2)] transition-all duration-300"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="end"
            className="w-44 p-1.5 bg-card/90 backdrop-blur-2xl border-primary/[0.1] shadow-[0_0_30px_oklch(0.78_0.2_185/0.08)]"
          >
            <button
              onClick={() => setFeedbackOpen(true)}
              className="flex items-center gap-2.5 w-full rounded-md px-2.5 py-2 text-xs text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
              Feedback
            </button>
            <button
              onClick={() => setEmbedOpen(true)}
              className="flex items-center gap-2.5 w-full rounded-md px-2.5 py-2 text-xs text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <CodeXml className="h-3.5 w-3.5 text-muted-foreground" />
              Embed Code
            </button>
            <button
              onClick={() => setSettingsExportOpen(true)}
              className="flex items-center gap-2.5 w-full rounded-md px-2.5 py-2 text-xs text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Braces className="h-3.5 w-3.5 text-muted-foreground" />
              Export Settings
            </button>
          </PopoverContent>
        </Popover>

        {/* Primary: Download */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDownloadOpen(true)}
              className="rounded-full bg-card/70 backdrop-blur-2xl border border-primary/[0.1] shadow-[0_0_25px_oklch(0.78_0.2_185/0.06),0_8px_32px_oklch(0_0_0/0.5)] h-10 w-10 hover:border-primary/40 hover:shadow-[0_0_30px_oklch(0.78_0.2_185/0.2)] hover:text-primary transition-all duration-300"
            >
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Download 3D</TooltipContent>
        </Tooltip>

        {/* Primary: Settings toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setControlsOpen((v) => !v);
                setTopPanel("settings");
              }}
              className={`rounded-full bg-card/70 backdrop-blur-2xl border border-primary/[0.1] shadow-[0_0_25px_oklch(0.78_0.2_185/0.06),0_8px_32px_oklch(0_0_0/0.5)] h-10 w-10 hover:border-primary/40 hover:shadow-[0_0_30px_oklch(0.78_0.2_185/0.2)] transition-all duration-300 ${
                controlsOpen
                  ? "text-primary border-primary/50 glow-border glow-text"
                  : ""
              }`}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Settings</TooltipContent>
        </Tooltip>
      </div>

      {/* Right-side settings panel */}
      <motion.div
        initial={{ opacity: 0, x: 20, pointerEvents: "none" as const }}
        animate={
          controlsOpen
            ? { opacity: 1, x: 0, pointerEvents: "auto" as const }
            : { opacity: 0, x: 20, pointerEvents: "none" as const }
        }
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className={`absolute top-16 right-5 bottom-5 max-md:left-5 ${topPanel === "settings" ? "z-[60]" : "z-[8]"}`}
      >
        <ControlsPanel
          depth={depth}
          onDepthChange={setDepth}
          strokeScale={strokeScale}
          onStrokeScaleChange={setStrokeScale}
          smoothness={smoothness}
          onSmoothnessChange={setSmoothness}
          color={color}
          onColorChange={setColor}
          bgColor={bgColor}
          onBgColorChange={setBgColor}
          textureUrl={textureUrl}
          onTextureUpload={handleTextureUpload}
          textureSettings={textureSettings}
          onTextureSettingsChange={setTextureSettings}
          materialSettings={materialSettings}
          onMaterialSettingsChange={setMaterialSettings}
          animate={animate}
          onAnimateChange={setAnimate}
          animateSpeed={animateSpeed}
          onAnimateSpeedChange={setAnimateSpeed}
          animateReverse={animateReverse}
          onAnimateReverseChange={setAnimateReverse}
          rotationX={rotationX}
          onRotationXChange={setRotationX}
          rotationY={rotationY}
          onRotationYChange={setRotationY}
          zoom={zoom}
          onZoomChange={setZoom}
          onReset={() => setResetKey((k) => k + 1)}
          lightSettings={lightSettings}
          onLightSettingsChange={setLightSettings}
          cursorOrbit={cursorOrbit}
          onCursorOrbitChange={setCursorOrbit}
          orbitStrength={orbitStrength}
          onOrbitStrengthChange={setOrbitStrength}
          resetOnIdle={resetOnIdle}
          onResetOnIdleChange={setResetOnIdle}
          resetDelay={resetDelay}
          onResetDelayChange={setResetDelay}
          onClose={() => setControlsOpen(false)}
          onLightingSectionChange={setLightingOpen}
        />
      </motion.div>

      {/* Drag-and-drop overlay */}
      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          <div className="absolute inset-3 rounded-2xl border border-primary/40 bg-card/30 backdrop-blur-2xl flex flex-col items-center justify-center gap-4 shadow-[0_0_60px_oklch(0.78_0.2_185/0.08),inset_0_0_80px_oklch(0.78_0.2_185/0.03)]">
            {/* Animated border glow */}
            <div className="absolute inset-0 rounded-2xl border border-primary/20 animate-pulse" />
            <svg
              className="h-16 w-16 text-primary/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <span className="text-xl font-medium text-primary/70 glow-text">
              Drop SVG file
            </span>
          </div>
        </motion.div>
      )}

      {/* Feedback widget */}
      <Freedback
        storage="email"
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        hideButton
      />

      {/* Download dialog */}
      <DownloadDialog
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        onDownload={handle3DExport}
      />

      {/* Embed dialog */}
      <EmbedDialog
        open={embedOpen}
        onOpenChange={setEmbedOpen}
        inputTab={inputTab}
        text={currentText}
        font={currentFont}
        activeSvg={activeSvg}
        depth={depth}
        smoothness={smoothness}
        strokeScale={strokeScale}
        color={color}
        materialSettings={materialSettings}
        textureUrl={textureUrl}
        textureSettings={textureSettings}
        animate={animate}
        animateSpeed={animateSpeed}
        animateReverse={animateReverse}
        rotationX={rotationX}
        rotationY={rotationY}
        zoom={zoom}
        cursorOrbit={cursorOrbit}
        orbitStrength={orbitStrength}
        resetOnIdle={resetOnIdle}
        resetDelay={resetDelay}
        lightSettings={lightSettings}
      />

      {/* Three.js settings export */}
      <SettingsExportDialog
        open={settingsExportOpen}
        onOpenChange={setSettingsExportOpen}
        depth={depth}
        smoothness={smoothness}
        color={color}
        bgColor={bgColor}
        materialSettings={materialSettings}
        textureUrl={textureUrl}
        animate={animate}
        animateSpeed={animateSpeed}
        animateReverse={animateReverse}
        rotationX={rotationX}
        rotationY={rotationY}
        zoom={zoom}
        lightSettings={lightSettings}
        onImport={(s: ParsedSettings) => {
          if (s.color !== undefined) setColor(s.color);
          if (s.bgColor !== undefined) setBgColor(s.bgColor);
          if (s.depth !== undefined) setDepth(s.depth);
          if (s.smoothness !== undefined) setSmoothness(s.smoothness);
          if (s.rotationX !== undefined) setRotationX(s.rotationX);
          if (s.rotationY !== undefined) setRotationY(s.rotationY);
          if (s.zoom !== undefined) setZoom(s.zoom);
          if (s.animate !== undefined) setAnimate(s.animate);
          if (s.animateSpeed !== undefined) setAnimateSpeed(s.animateSpeed);
          if (s.animateReverse !== undefined)
            setAnimateReverse(s.animateReverse);
          if (s.materialSettings) {
            setMaterialSettings((prev) => ({ ...prev, ...s.materialSettings }));
          }
          if (s.lightSettings) {
            setLightSettings((prev) => ({ ...prev, ...s.lightSettings }));
          }
        }}
      />

      {/* Export modal */}
      <ExportModal
        open={exportOpen}
        onClose={() => {}}
        canvasRef={canvasRef}
        captureFn={captureFnRef}
        animate={animate}
        animateSpeed={animateSpeed}
        onPreviewOpen={setExportPreviewOpen}
      />
    </main>
  );
}
