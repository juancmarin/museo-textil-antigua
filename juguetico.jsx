import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Pencil, Eraser, Trash2, FlipHorizontal, FlipVertical,
  Undo2, Eye, Users, Mail, X, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Download, Check, ArrowLeft
} from "lucide-react";

/* ─── constants ─── */
const ACHIOTE  = "#FF6927";
const SACBE    = "#E8E5D9";
const DARK     = "#2D2520";
const MID      = "#6B5E54";
const LIGHT_BG = "#F5F3ED";
const CS       = 18;          // cell half-diagonal (viewBox units)

/* ─── helpers ─── */
const makeGrid = (r, c) => Array.from({ length: r }, () => Array(c).fill(0));

const cellCenter = (r, c) => ({
  cx: c * 2 * CS + CS + (r % 2 ? CS : 0),
  cy: r * CS + CS,
});

const diamondPts = (cx, cy) =>
  `${cx},${cy - CS} ${cx + CS},${cy} ${cx},${cy + CS} ${cx - CS},${cy}`;

const hitTest = (mx, my, rows, cols) => {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const { cx, cy } = cellCenter(r, c);
      if (Math.abs(mx - cx) / CS + Math.abs(my - cy) / CS <= 1) return { r, c };
    }
  }
  return null;
};

const svgDims = (rows, cols) => ({
  w: (2 * cols + 2) * CS,
  h: (rows + 2) * CS,
});

const maskEmail = (e) => {
  if (!e) return "";
  const [local, domain] = e.split("@");
  if (!domain) return e;
  return local.slice(0, 2) + "••••@" + domain;
};

/* ─── MiniGrid thumbnail ─── */
const MiniGrid = ({ grid, size = 80 }) => {
  if (!grid || !grid.length) return null;
  const rows = grid.length, cols = grid[0].length;
  const s = 4;
  const w = (2 * cols + 2) * s;
  const h = (rows + 2) * s;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={size} height={size * h / w}
      style={{ background: SACBE, borderRadius: 6 }}>
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const cx = c * 2 * s + s + (r % 2 ? s : 0);
          const cy = r * s + s;
          return (
            <polygon key={`${r}-${c}`}
              points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
              fill={cell ? ACHIOTE : SACBE}
              stroke={DARK} strokeWidth={0.3} strokeOpacity={0.15} />
          );
        })
      )}
    </svg>
  );
};

/* ─── Main component ─── */
export default function Juguetico() {
  const [view, setView] = useState("editor");   // editor | preview | gallery | success
  const [rows, setRows] = useState(18);
  const [cols, setCols] = useState(10);
  const [grid, setGrid] = useState(() => makeGrid(18, 10));
  const [tool, setTool] = useState("draw");
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastCell, setLastCell] = useState(null);
  const [history, setHistory] = useState([]);
  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const svgRef = useRef(null);

  /* ─── Load gallery on mount ─── */
  useEffect(() => {
    const load = async () => {
      try {
        const result = await window.storage.list("jtk:", true);
        if (result && result.keys && result.keys.length > 0) {
          const designs = [];
          for (const key of result.keys.slice(-60)) {
            try {
              const item = await window.storage.get(key, true);
              if (item) designs.push(JSON.parse(item.value));
            } catch (_) {}
          }
          setGallery(designs.sort((a, b) => b.ts - a.ts));
        }
      } catch (_) {}
      setGalleryLoading(false);
    };
    load();
  }, []);

  /* ─── Grid resize ─── */
  const resizeGrid = (newR, newC) => {
    const nr = Math.max(4, Math.min(24, newR));
    const nc = Math.max(4, Math.min(24, newC));
    pushHistory();
    const newGrid = makeGrid(nr, nc);
    for (let r = 0; r < Math.min(nr, rows); r++)
      for (let c = 0; c < Math.min(nc, cols); c++)
        newGrid[r][c] = grid[r]?.[c] ?? 0;
    setRows(nr);
    setCols(nc);
    setGrid(newGrid);
  };

  /* ─── History (undo) ─── */
  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-20), grid.map((r) => [...r])]);
  }, [grid]);

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setGrid(prev);
    if (prev.length !== rows) setRows(prev.length);
    if (prev[0]?.length !== cols) setCols(prev[0]?.length ?? cols);
  };

  /* ─── Tools ─── */
  const clearGrid = () => { pushHistory(); setGrid(makeGrid(rows, cols)); };

  const mirrorH = () => {
    pushHistory();
    setGrid((g) => g.map((row) => {
      const half = Math.ceil(row.length / 2);
      return row.map((v, c) => (c < half ? v : row[row.length - 1 - c]));
    }));
  };

  const mirrorV = () => {
    pushHistory();
    setGrid((g) => {
      const half = Math.ceil(g.length / 2);
      return g.map((row, r) => (r < half ? row : [...g[g.length - 1 - r]]));
    });
  };

  /* ─── Pointer interaction ─── */
  const getSVGCoord = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { w, h } = svgDims(rows, cols);
    return {
      x: ((clientX - rect.left) / rect.width) * w,
      y: ((clientY - rect.top) / rect.height) * h,
    };
  }, [rows, cols]);

  const applyTool = useCallback((r, c) => {
    setGrid((g) => {
      const ng = g.map((row) => [...row]);
      if (tool === "draw") ng[r][c] = 1;
      else if (tool === "erase") ng[r][c] = 0;
      return ng;
    });
  }, [tool]);

  const onDown = useCallback((e) => {
    e.preventDefault();
    pushHistory();
    setIsDrawing(true);
    const pt = getSVGCoord(e);
    if (!pt) return;
    const hit = hitTest(pt.x, pt.y, rows, cols);
    if (hit) { applyTool(hit.r, hit.c); setLastCell(hit); }
  }, [getSVGCoord, rows, cols, applyTool, pushHistory]);

  const onMove = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pt = getSVGCoord(e);
    if (!pt) return;
    const hit = hitTest(pt.x, pt.y, rows, cols);
    if (hit && (!lastCell || hit.r !== lastCell.r || hit.c !== lastCell.c)) {
      applyTool(hit.r, hit.c);
      setLastCell(hit);
    }
  }, [isDrawing, getSVGCoord, rows, cols, applyTool, lastCell]);

  const onUp = useCallback(() => { setIsDrawing(false); setLastCell(null); }, []);

  useEffect(() => {
    window.addEventListener("pointerup", onUp);
    window.addEventListener("touchend", onUp);
    return () => { window.removeEventListener("pointerup", onUp); window.removeEventListener("touchend", onUp); };
  }, [onUp]);

  /* ─── Save design ─── */
  const saveDesign = async () => {
    if (!email || !email.includes("@") || !acceptTerms) return;
    const design = { grid, rows, cols, email, ts: Date.now() };
    try {
      await window.storage.set(`jtk:${design.ts}`, JSON.stringify(design), true);
    } catch (_) {}
    setGallery((g) => [design, ...g]);
    setShowEmail(false);
    setEmail("");
    setAcceptTerms(false);
    setView("success");
    setTimeout(() => setView("editor"), 3500);
  };

  const hasContent = grid.some((row) => row.some((c) => c === 1));

  /* ─── SVG dims ─── */
  const { w: svgW, h: svgH } = svgDims(rows, cols);

  /* ═══════════════════════════════════════════════ */
  /*                    RENDER                       */
  /* ═══════════════════════════════════════════════ */

  /* ─── Success view ─── */
  if (view === "success") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: SACBE, fontFamily: "'Instrument Sans', system-ui, sans-serif", padding: 24, textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: ACHIOTE, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, animation: "pop 0.4s ease" }}>
          <Check size={40} color="#fff" strokeWidth={3} />
        </div>
        <h2 style={{ color: DARK, fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>¡Diseño guardado!</h2>
        <p style={{ color: MID, fontSize: 15, maxWidth: 300, lineHeight: 1.5 }}>
          Tu patrón textil ha sido registrado y pronto llegará a tu correo en formato PDF.
        </p>
        <div style={{ marginTop: 24 }}>
          <MiniGrid grid={grid} size={140} />
        </div>
        <style>{`@keyframes pop { 0% { transform: scale(0); } 70% { transform: scale(1.15); } 100% { transform: scale(1); } }`}</style>
      </div>
    );
  }

  /* ─── Gallery view ─── */
  if (view === "gallery") {
    return (
      <div style={{ minHeight: "100vh", background: SACBE, fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>
        {/* Header */}
        <div style={{ background: DARK, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setView("editor")} style={{ background: "none", border: "none", cursor: "pointer", color: SACBE, display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600 }}>
            <ArrowLeft size={18} /> Volver al editor
          </button>
          <div style={{ flex: 1 }} />
          <Users size={18} color={ACHIOTE} />
          <span style={{ color: SACBE, fontSize: 13, fontWeight: 600 }}>{gallery.length} diseños</span>
        </div>

        {/* Gallery header */}
        <div style={{ padding: "28px 20px 12px", textAlign: "center" }}>
          <h2 style={{ color: DARK, fontSize: 22, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Galería colectiva</h2>
          <p style={{ color: MID, fontSize: 14, margin: 0, lineHeight: 1.5 }}>Patrones creados por visitantes del museo</p>
        </div>

        {/* Selected design detail */}
        {selectedDesign && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(45,37,32,0.85)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
            onClick={() => setSelectedDesign(null)}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 400, width: "100%", textAlign: "center" }}
              onClick={(e) => e.stopPropagation()}>
              <MiniGrid grid={selectedDesign.grid} size={240} />
              <p style={{ color: MID, fontSize: 13, marginTop: 16 }}>
                {maskEmail(selectedDesign.email)} · {new Date(selectedDesign.ts).toLocaleDateString("es-GT")}
              </p>

              {/* Tiled preview */}
              <div style={{ marginTop: 16, padding: 12, background: SACBE, borderRadius: 8 }}>
                <p style={{ color: MID, fontSize: 11, margin: "0 0 8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Vista como patrón continuo</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <MiniGrid key={i} grid={selectedDesign.grid} size={70} />
                  ))}
                </div>
              </div>

              <button onClick={() => setSelectedDesign(null)}
                style={{ marginTop: 16, padding: "10px 24px", background: DARK, color: SACBE, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Gallery grid */}
        {galleryLoading ? (
          <p style={{ textAlign: "center", color: MID, padding: 40 }}>Cargando diseños…</p>
        ) : gallery.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: MID }}>
            <Users size={48} color={MID} strokeWidth={1} style={{ marginBottom: 16, opacity: 0.4 }} />
            <p style={{ fontSize: 15, margin: "0 0 8px" }}>La galería está vacía</p>
            <p style={{ fontSize: 13, opacity: 0.7 }}>¡Sé el primero en crear un diseño!</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 16, padding: "16px 20px 40px" }}>
            {gallery.map((d, i) => (
              <div key={d.ts || i} onClick={() => setSelectedDesign(d)}
                style={{ background: "#fff", borderRadius: 12, padding: 12, cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; }}>
                <MiniGrid grid={d.grid} size={120} />
                <p style={{ color: MID, fontSize: 11, margin: "8px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {maskEmail(d.email)}
                </p>
                <p style={{ color: MID, fontSize: 10, margin: "2px 0 0", opacity: 0.6 }}>
                  {new Date(d.ts).toLocaleDateString("es-GT")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ─── Preview overlay ─── */
  if (view === "preview") {
    return (
      <div style={{ minHeight: "100vh", background: DARK, fontFamily: "'Instrument Sans', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setView("editor")}
            style={{ background: "none", border: "none", cursor: "pointer", color: SACBE, display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600 }}>
            <ArrowLeft size={18} /> Volver
          </button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ color: SACBE, fontSize: 14, fontWeight: 600 }}>Vista previa — Patrón continuo</span>
          </div>
          <div style={{ width: 80 }} />
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, maxWidth: 600 }}>
            {Array.from({ length: 16 }).map((_, i) => (
              <MiniGrid key={i} grid={grid} size={140} />
            ))}
          </div>
        </div>
        <div style={{ padding: "16px 20px", textAlign: "center" }}>
          <p style={{ color: MID, fontSize: 13, margin: 0 }}>
            Así se vería tu diseño como un textil continuo
          </p>
        </div>
      </div>
    );
  }

  /* ─── Editor view (main) ─── */
  return (
    <div style={{ minHeight: "100vh", background: SACBE, fontFamily: "'Instrument Sans', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: DARK, padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: ACHIOTE }} />
              <span style={{ color: SACBE, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>MUTEX</span>
            </div>
            <h1 style={{ color: SACBE, fontSize: 20, fontWeight: 700, margin: "4px 0 0", letterSpacing: "-0.02em" }}>Juguetico</h1>
          </div>
          <button onClick={() => setView("gallery")}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 14px", color: SACBE, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={15} /> Galería {gallery.length > 0 && <span style={{ background: ACHIOTE, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>{gallery.length}</span>}
          </button>
        </div>
        <p style={{ color: "rgba(232,229,217,0.6)", fontSize: 13, margin: "6px 0 0", lineHeight: 1.4 }}>
          Crea tu propio diseño textil inspirado en la tradición guatemalteca
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ background: "#fff", borderBottom: "1px solid rgba(45,37,32,0.08)", padding: "10px 16px", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {/* Drawing tools */}
        {[
          { id: "draw", icon: Pencil, label: "Dibujar" },
          { id: "erase", icon: Eraser, label: "Borrar" },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTool(id)}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: tool === id ? ACHIOTE : "transparent",
              color: tool === id ? "#fff" : DARK,
            }}>
            <Icon size={15} /> {label}
          </button>
        ))}

        <div style={{ width: 1, height: 24, background: "rgba(45,37,32,0.1)", margin: "0 4px" }} />

        {/* Action tools */}
        {[
          { action: clearGrid, icon: Trash2, label: "Limpiar" },
          { action: mirrorH, icon: FlipHorizontal, label: "Espejo ↔" },
          { action: mirrorV, icon: FlipVertical, label: "Espejo ↕" },
          { action: undo, icon: Undo2, label: "Deshacer", disabled: history.length === 0 },
        ].map(({ action, icon: Icon, label, disabled }) => (
          <button key={label} onClick={action} disabled={disabled}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 10px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 500, cursor: disabled ? "default" : "pointer", background: "transparent", color: disabled ? "rgba(45,37,32,0.25)" : MID }}>
            <Icon size={14} /> <span style={{ display: "none", "@media(min-width:480px)": { display: "inline" } }}>{label}</span>
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Grid size */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: MID }}>
          <button onClick={() => resizeGrid(rows, cols - 1)} style={{ background: "none", border: "1px solid rgba(45,37,32,0.12)", borderRadius: 4, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: MID, padding: 0 }}>
            <ChevronLeft size={12} />
          </button>
          <span style={{ fontWeight: 600, minWidth: 18, textAlign: "center" }}>{cols}</span>
          <button onClick={() => resizeGrid(rows, cols + 1)} style={{ background: "none", border: "1px solid rgba(45,37,32,0.12)", borderRadius: 4, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: MID, padding: 0 }}>
            <ChevronRight size={12} />
          </button>
          <span style={{ margin: "0 2px", color: "rgba(45,37,32,0.3)" }}>×</span>
          <button onClick={() => resizeGrid(rows - 1, cols)} style={{ background: "none", border: "1px solid rgba(45,37,32,0.12)", borderRadius: 4, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: MID, padding: 0 }}>
            <ChevronDown size={12} />
          </button>
          <span style={{ fontWeight: 600, minWidth: 18, textAlign: "center" }}>{rows}</span>
          <button onClick={() => resizeGrid(rows + 1, cols)} style={{ background: "none", border: "1px solid rgba(45,37,32,0.12)", borderRadius: 4, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: MID, padding: 0 }}>
            <ChevronUp size={12} />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 12px", overflow: "hidden" }}>
        <div style={{ width: "100%", maxWidth: 520, position: "relative" }}>
          {/* SVG Grid */}
          <svg ref={svgRef}
            viewBox={`0 0 ${svgW} ${svgH}`}
            style={{ width: "100%", height: "auto", touchAction: "none", cursor: tool === "draw" ? "crosshair" : "pointer", background: "#fff", borderRadius: 12, boxShadow: "0 2px 20px rgba(45,37,32,0.08)" }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onTouchStart={onDown}
            onTouchMove={onMove}
            onTouchEnd={onUp}>
            {grid.map((row, r) =>
              row.map((cell, c) => {
                const { cx, cy } = cellCenter(r, c);
                return (
                  <polygon key={`${r}-${c}`}
                    points={diamondPts(cx, cy)}
                    fill={cell ? ACHIOTE : SACBE}
                    stroke={DARK}
                    strokeWidth={0.5}
                    strokeOpacity={0.12}
                  />
                );
              })
            )}
          </svg>

          {/* Hint */}
          {!hasContent && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none", textAlign: "center", color: MID, opacity: 0.5 }}>
              <Pencil size={28} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 13, margin: 0 }}>Dibuja sobre la grilla</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div style={{ padding: "12px 20px 24px", display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={() => hasContent && setView("preview")} disabled={!hasContent}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 20px", borderRadius: 10, border: `1.5px solid ${DARK}`, background: "transparent", color: DARK, fontSize: 14, fontWeight: 600, cursor: hasContent ? "pointer" : "default", opacity: hasContent ? 1 : 0.3 }}>
          <Eye size={17} /> Vista previa
        </button>
        <button onClick={() => hasContent && setShowEmail(true)} disabled={!hasContent}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 24px", borderRadius: 10, border: "none", background: hasContent ? ACHIOTE : "rgba(45,37,32,0.12)", color: hasContent ? "#fff" : "rgba(45,37,32,0.3)", fontSize: 14, fontWeight: 700, cursor: hasContent ? "pointer" : "default" }}>
          <Mail size={17} /> Guardar y enviar
        </button>
      </div>

      {/* Email modal */}
      {showEmail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(45,37,32,0.8)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setShowEmail(false)}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 380, width: "100%", position: "relative" }}
            onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowEmail(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: MID }}>
              <X size={20} />
            </button>

            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <MiniGrid grid={grid} size={120} />
            </div>

            <h3 style={{ color: DARK, fontSize: 18, fontWeight: 700, margin: "0 0 6px", textAlign: "center" }}>
              Recibe tu diseño en PDF
            </h3>
            <p style={{ color: MID, fontSize: 13, margin: "0 0 20px", textAlign: "center", lineHeight: 1.5 }}>
              Ingresa tu correo electrónico y te enviaremos tu patrón textil en formato vectorial.
            </p>

            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: DARK, marginBottom: 6 }}>
              Correo electrónico
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              onKeyDown={(e) => e.key === "Enter" && saveDesign()}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid rgba(45,37,32,0.15)`, fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.2s" }}
              onFocus={(e) => (e.target.style.borderColor = ACHIOTE)}
              onBlur={(e) => (e.target.style.borderColor = "rgba(45,37,32,0.15)")}
            />

            {/* Terms checkbox */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 16, cursor: "pointer", userSelect: "none" }}>
              <div onClick={() => setAcceptTerms(!acceptTerms)}
                style={{
                  width: 20, minWidth: 20, height: 20, borderRadius: 5,
                  border: acceptTerms ? `2px solid ${ACHIOTE}` : "2px solid rgba(45,37,32,0.2)",
                  background: acceptTerms ? ACHIOTE : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s", marginTop: 1,
                }}>
                {acceptTerms && <Check size={13} color="#fff" strokeWidth={3} />}
              </div>
              <span onClick={() => setAcceptTerms(!acceptTerms)}
                style={{ fontSize: 12, color: MID, lineHeight: 1.45 }}>
                Para recibir tu diseño debes aceptar los{" "}
                <a href="#" onClick={(e) => e.stopPropagation()} style={{ color: ACHIOTE, textDecoration: "underline", fontWeight: 600 }}>
                  Términos y condiciones
                </a>{" "}y la{" "}
                <a href="#" onClick={(e) => e.stopPropagation()} style={{ color: ACHIOTE, textDecoration: "underline", fontWeight: 600 }}>
                  Política de privacidad
                </a>.
              </span>
            </label>

            <button onClick={saveDesign}
              disabled={!email || !email.includes("@") || !acceptTerms}
              style={{
                width: "100%", marginTop: 14, padding: "13px 0", borderRadius: 10, border: "none", fontSize: 15, fontWeight: 700, cursor: email && email.includes("@") && acceptTerms ? "pointer" : "default",
                background: email && email.includes("@") && acceptTerms ? ACHIOTE : "rgba(45,37,32,0.1)",
                color: email && email.includes("@") && acceptTerms ? "#fff" : "rgba(45,37,32,0.3)",
                transition: "background 0.2s",
              }}>
              Enviar a mi correo
            </button>

            <p style={{ color: MID, fontSize: 11, margin: "12px 0 0", textAlign: "center", lineHeight: 1.4, opacity: 0.7 }}>
              Tu diseño también se exhibirá en la galería colectiva del museo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
