import { useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { FileUp, Maximize, Minus, Plus } from 'lucide-react';
import { FilePicker } from './FilePicker';
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
  onPdfFile,
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
          await doc.loadingTask.destroy();
          return;
        }

        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });

        if (cancelled) {
          await doc.loadingTask.destroy();
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
      pdfDoc.loadingTask.destroy();
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

  const stopPointer = (event) => event.stopPropagation();

  return (
    <div
      ref={containerRef}
      className={`canvas${isPanning ? ' is-panning' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointerInteraction}
      onPointerCancel={endPointerInteraction}
    >
      {!pdfFile && (
        <FilePicker
          accept=".pdf,application/pdf"
          onFile={onPdfFile}
          inputLabel="Plantilla PDF"
          className="empty-state"
          onPointerDown={stopPointer}
        >
          <span className="empty-state-icon" aria-hidden><FileUp size={22} /></span>
          <span className="empty-state-title">Arrastra tu plantilla PDF aquí</span>
          <span className="empty-state-text">o haz clic para elegir un archivo</span>
        </FilePicker>
      )}

      {pdfFile && (
        <div className="toolbar" onPointerDown={stopPointer}>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setZoomLevel((zoom) => Math.max(MIN_ZOOM, zoom - ZOOM_STEP))}
            disabled={zoomLevel <= MIN_ZOOM}
            title="Alejar"
            aria-label="Alejar"
          >
            <Minus size={16} />
          </button>
          <span className="toolbar-value" aria-live="polite">{Math.round(zoomLevel * 100)}%</span>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setZoomLevel((zoom) => Math.min(MAX_ZOOM, zoom + ZOOM_STEP))}
            disabled={zoomLevel >= MAX_ZOOM}
            title="Acercar"
            aria-label="Acercar"
          >
            <Plus size={16} />
          </button>
          <span className="toolbar-divider" aria-hidden />
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              setZoomLevel(1);
              setPan({ x: 0, y: 0 });
            }}
            title="Ajustar a la vista"
            aria-label="Ajustar a la vista"
          >
            <Maximize size={15} />
          </button>
        </div>
      )}

      <div
        className="canvas-stage"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
          transition: isPanning ? 'none' : undefined,
        }}
      >
        {pageSize && baseScale > 0 && (
          <div
            className="page"
            style={{
              width: pageSize.width * baseScale,
              height: pageSize.height * baseScale,
            }}
          >
            <canvas ref={canvasRef} className="page-canvas" />
            <canvas ref={overlayRef} className="page-overlay" />
            {textBoxes.map((box) => (
              <div
                key={box.key}
                data-drag-layer={box.key}
                data-label={LAYER_LABELS[box.key]}
                title={LAYER_LABELS[box.key]}
                className={[
                  'text-box',
                  activeLayer === box.key && 'is-active',
                  draggingLayer === box.key && 'is-dragging',
                ].filter(Boolean).join(' ')}
                style={{
                  left: box.left,
                  top: box.top,
                  width: box.width,
                  height: box.height,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
