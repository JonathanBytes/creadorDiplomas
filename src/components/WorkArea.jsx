import { useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { clamp } from '../utils/clamp';
import { computeTextLayout } from '../utils/textLayout';
import { DEFAULT_PREVIEW_FONT, measureTextWidth } from '../utils/measureText';
import { DESCRIPTION_LAYER, LAYER_KEYS, LAYER_LABELS, NAME_LAYER } from '../utils/layers';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.2;
const VIEWPORT_PADDING = 80;
const MAX_OVERLAY_AREA = 16_000_000;
const MIN_DRAG_BOX_HEIGHT = 20;
const MIN_DRAG_BOX_WIDTH = 24;

const PLACEHOLDERS = {
  [NAME_LAYER]: 'Nombre del Estudiante',
  [DESCRIPTION_LAYER]: 'Descripción del Estudiante',
};

export function WorkArea({
  pdfFile,
  layers,
  previewTexts,
  activeLayer,
  onSelectLayer,
  onLayerPositionChange,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const fontFacesRef = useRef({});
  const pointerStateRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageSize, setPageSize] = useState(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [draggingLayer, setDraggingLayer] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [fontFamilies, setFontFamilies] = useState({
    [NAME_LAYER]: DEFAULT_PREVIEW_FONT,
    [DESCRIPTION_LAYER]: DEFAULT_PREVIEW_FONT,
  });

  const displayTexts = useMemo(
    () => ({
      [NAME_LAYER]: previewTexts?.name || PLACEHOLDERS[NAME_LAYER],
      [DESCRIPTION_LAYER]: previewTexts?.description || PLACEHOLDERS[DESCRIPTION_LAYER],
    }),
    [previewTexts?.name, previewTexts?.description],
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdfFile) return;

    let cancelled = false;

    const load = async () => {
      try {
        const bytes = await pdfFile.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: bytes }).promise;

        if (cancelled) {
          await doc.destroy();
          return;
        }

        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });

        if (cancelled) {
          await doc.destroy();
          return;
        }

        setPageSize({ width: viewport.width, height: viewport.height });
        setPdfDoc(doc);
        setZoomLevel(1);
        setPan({ x: 0, y: 0 });
      } catch (error) {
        if (!cancelled) console.error('Error loading PDF:', error);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [pdfFile]);

  useEffect(() => {
    if (!pdfDoc) return;
    return () => {
      pdfDoc.destroy();
    };
  }, [pdfDoc]);

  useEffect(
    () => () => {
      Object.values(fontFacesRef.current).forEach((face) => {
        if (face) document.fonts.delete(face);
      });
      fontFacesRef.current = {};
    },
    [],
  );

  const nameFontFile = layers.name.customFont;
  const descriptionFontFile = layers.description.customFont;

  // The description inherits the name font unless it has its own upload,
  // matching what the PDF exporter does.
  const resolvedFontFamilies = useMemo(
    () => ({
      [NAME_LAYER]: fontFamilies[NAME_LAYER],
      [DESCRIPTION_LAYER]: descriptionFontFile
        ? fontFamilies[DESCRIPTION_LAYER]
        : fontFamilies[NAME_LAYER],
    }),
    [fontFamilies, descriptionFontFile],
  );

  useEffect(() => {
    let cancelled = false;

    const loadLayerFont = async (key, file) => {
      const previousFace = fontFacesRef.current[key];

      if (!file) {
        if (previousFace) {
          document.fonts.delete(previousFace);
          fontFacesRef.current[key] = null;
        }
        return [key, DEFAULT_PREVIEW_FONT];
      }

      try {
        const family = `CustomFont_${key}_${Date.now()}`;
        const face = new FontFace(family, await file.arrayBuffer());
        await face.load();

        if (cancelled) return null;

        document.fonts.add(face);
        if (previousFace) document.fonts.delete(previousFace);
        fontFacesRef.current[key] = face;
        return [key, family];
      } catch (error) {
        if (!cancelled) console.error(`Error loading ${key} font:`, error);
        return null;
      }
    };

    Promise.all([
      loadLayerFont(NAME_LAYER, nameFontFile),
      loadLayerFont(DESCRIPTION_LAYER, descriptionFontFile),
    ]).then((entries) => {
      if (cancelled) return;

      setFontFamilies((current) => {
        const next = { ...current };
        for (const entry of entries) {
          if (entry) next[entry[0]] = entry[1];
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [nameFontFile, descriptionFontFile]);

  const baseScale = useMemo(() => {
    if (!pageSize || !containerSize.width || !containerSize.height) return 0;

    const availableWidth = Math.max(containerSize.width - VIEWPORT_PADDING, 40);
    const availableHeight = Math.max(containerSize.height - VIEWPORT_PADDING, 40);

    return Math.min(
      availableWidth / pageSize.width,
      availableHeight / pageSize.height,
      1.2,
    );
  }, [pageSize, containerSize]);

  useEffect(() => {
    if (!pdfDoc || !pageSize || !baseScale || !canvasRef.current) return;

    let cancelled = false;
    let renderTask = null;

    const renderPage = async () => {
      const page = await pdfDoc.getPage(1);
      if (cancelled) return;

      const ratio = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: baseScale * ratio });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));

      renderTask = page.render({ canvasContext: context, viewport });

      try {
        await renderTask.promise;
      } catch (error) {
        if (!cancelled && error?.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF page:', error);
        }
      }
    };

    renderPage();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdfDoc, pageSize, baseScale]);

  const textWidths = useMemo(
    () => ({
      [NAME_LAYER]: measureTextWidth(displayTexts[NAME_LAYER], resolvedFontFamilies[NAME_LAYER], layers.name.fontSize),
      [DESCRIPTION_LAYER]: measureTextWidth(
        displayTexts[DESCRIPTION_LAYER],
        resolvedFontFamilies[DESCRIPTION_LAYER],
        layers.description.fontSize,
      ),
    }),
    [displayTexts, resolvedFontFamilies, layers.name.fontSize, layers.description.fontSize],
  );

  const layouts = useMemo(() => {
    if (!pageSize) return null;

    const result = {};

    for (const key of LAYER_KEYS) {
      const layer = layers[key];
      if (!layer.enabled) {
        result[key] = null;
        continue;
      }

      result[key] = computeTextLayout({
        pageWidth: pageSize.width,
        pageHeight: pageSize.height,
        position: layer.position,
        textMargin: layer.margin,
        fontSize: layer.fontSize,
        textWidth: textWidths[key],
        isUnderline: layer.isUnderline,
        underlineOffset: layer.underlineOffset,
        underlineThickness: layer.underlineThickness,
      });
    }

    return result;
  }, [pageSize, layers, textWidths]);

  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || !pageSize || !baseScale || !layouts) return;

    const ratio = window.devicePixelRatio || 1;
    const quality = clamp(zoomLevel, 1, 2);
    let scale = baseScale * ratio * quality;
    const area = pageSize.width * pageSize.height * scale * scale;

    if (area > MAX_OVERLAY_AREA) {
      scale *= Math.sqrt(MAX_OVERLAY_AREA / area);
    }

    canvas.width = Math.max(1, Math.round(pageSize.width * scale));
    canvas.height = Math.max(1, Math.round(pageSize.height * scale));

    const context = canvas.getContext('2d');
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, pageSize.width, pageSize.height);

    for (const key of LAYER_KEYS) {
      const layer = layers[key];
      const layout = layouts[key];
      if (!layout) continue;

      context.font = `${layout.fittedFontSize}px ${resolvedFontFamilies[key]}`;
      context.fillStyle = layer.color;
      context.textAlign = 'left';
      context.textBaseline = 'alphabetic';
      context.fillText(displayTexts[key], layout.startX, layout.baselineY);

      if (layout.underline) {
        context.fillRect(
          layout.underline.x,
          layout.underline.top,
          layout.underline.width,
          layout.underline.thickness,
        );
      }
    }
  }, [pageSize, baseScale, zoomLevel, layouts, displayTexts, resolvedFontFamilies, layers]);

  const pointerToPage = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * pageSize.width,
      y: ((event.clientY - rect.top) / rect.height) * pageSize.height,
    };
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0 || !pageSize || !canvasRef.current) return;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort; dragging still works without it.
    }

    const layerKey = event.target.dataset?.dragLayer;

    if (layerKey && layers[layerKey]) {
      const point = pointerToPage(event);
      const position = layers[layerKey].position;

      onSelectLayer?.(layerKey);
      pointerStateRef.current = {
        mode: 'text',
        layerKey,
        offsetX: position.x * pageSize.width - point.x,
        offsetY: position.y * pageSize.height - point.y,
      };
      setDraggingLayer(layerKey);
      return;
    }

    pointerStateRef.current = {
      mode: 'pan',
      startX: event.clientX - pan.x,
      startY: event.clientY - pan.y,
    };
    setIsPanning(true);
  };

  const handlePointerMove = (event) => {
    const state = pointerStateRef.current;
    if (!state || !pageSize) return;

    if (state.mode === 'text') {
      const point = pointerToPage(event);
      onLayerPositionChange(state.layerKey, {
        x: clamp((point.x + state.offsetX) / pageSize.width, 0, 1),
        y: clamp((point.y + state.offsetY) / pageSize.height, 0, 1),
      });
      return;
    }

    setPan({
      x: event.clientX - state.startX,
      y: event.clientY - state.startY,
    });
  };

  const endPointerInteraction = (event) => {
    pointerStateRef.current = null;
    setDraggingLayer(null);
    setIsPanning(false);

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const textBoxes = useMemo(() => {
    if (!pageSize || !layouts || !baseScale) return [];

    const padding = 4;

    return LAYER_KEYS.flatMap((key) => {
      const layout = layouts[key];
      if (!layout) return [];

      const position = layers[key].position;
      const width = Math.max(layout.width, MIN_DRAG_BOX_WIDTH / baseScale);
      const height = Math.max(layout.fittedFontSize, MIN_DRAG_BOX_HEIGHT / baseScale);

      return [{
        key,
        left: (position.x * pageSize.width - width / 2) * baseScale - padding,
        top: (position.y * pageSize.height - height / 2) * baseScale - padding,
        width: width * baseScale + padding * 2,
        height: height * baseScale + padding * 2,
      }];
    });
  }, [pageSize, layouts, baseScale, layers]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        height: '100%',
        background: 'var(--bg-color)',
        position: 'relative',
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : 'default',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointerInteraction}
      onPointerCancel={endPointerInteraction}
    >
      {!pdfFile && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'var(--text-secondary)',
            textAlign: 'center',
          }}
        >
          <p>No hay PDF cargado</p>
          <p style={{ fontSize: '0.8rem' }}>
            Sube una plantilla desde el panel lateral para comenzar
          </p>
        </div>
      )}

      {pdfFile && (
        <div
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '999px',
            padding: '0.5rem 1rem',
            display: 'flex',
            gap: '1rem',
            zIndex: 10,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            onClick={() => setZoomLevel((zoom) => Math.max(MIN_ZOOM, zoom - ZOOM_STEP))}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
            title="Alejar"
          >
            <ZoomOut size={20} />
          </button>
          <span style={{ minWidth: '3rem', textAlign: 'center', fontSize: '0.875rem' }}>
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((zoom) => Math.min(MAX_ZOOM, zoom + ZOOM_STEP))}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
            title="Acercar"
          >
            <ZoomIn size={20} />
          </button>
          <div style={{ width: '1px', background: 'var(--border-color)' }} />
          <button
            onClick={() => {
              setZoomLevel(1);
              setPan({ x: 0, y: 0 });
            }}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
            title="Reiniciar Vista"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      )}

      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {pageSize && baseScale > 0 && (
          <div
            style={{
              position: 'relative',
              width: pageSize.width * baseScale,
              height: pageSize.height * baseScale,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <canvas
              ref={canvasRef}
              style={{ display: 'block', width: '100%', height: '100%' }}
            />
            <canvas
              ref={overlayRef}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            />
            {textBoxes.map((box) => {
              const isActive = activeLayer === box.key;

              return (
                <div
                  key={box.key}
                  data-drag-layer={box.key}
                  title={LAYER_LABELS[box.key]}
                  style={{
                    position: 'absolute',
                    left: box.left,
                    top: box.top,
                    width: box.width,
                    height: box.height,
                    border: isActive
                      ? '2px solid rgba(99, 102, 241, 0.9)'
                      : '1px dashed rgba(99, 102, 241, 0.45)',
                    borderRadius: '4px',
                    background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                    cursor: draggingLayer === box.key ? 'grabbing' : 'grab',
                    userSelect: 'none',
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
