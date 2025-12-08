import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export function WorkArea({ 
  pdfFile, 
  customFont,
  textPosition, 
  onPositionChange, 
  previewText, 
  fontSize, 
  fontColor,
  isUnderline,
  underlineOffset = 5,
  underlineThickness = 2,
  textMargin = 40
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const textRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [baseScale, setBaseScale] = useState(1); // Scale to fit screen
  const [zoomLevel, setZoomLevel] = useState(1); // User zoom multiplier
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [fontFamily, setFontFamily] = useState('sans-serif');
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [fitScale, setFitScale] = useState(1);
  
  const currentScale = baseScale * zoomLevel;

  // Measure text and fit
  useEffect(() => {
    if (!textRef.current || !canvasRef.current) return;
    
    const measure = () => {
        const textElement = textRef.current;
        const canvasWidth = canvasRef.current.width / (window.devicePixelRatio || 1); // Logic check: canvas.width is pixel width.
        // Actually canvas.width is set to viewport.width which is PDF points usually, or pixels if scaled.
        // Let's rely on getBoundingClientRect of canvas for visual width.
        const canvasRect = canvasRef.current.getBoundingClientRect();
        // But canvasRect is affected by zoom!
        // We need the "PDF Page Width" in the context of the text rendering.
        // The text is rendered at `fontSize * currentScale`.
        // `currentScale` = `baseScale * zoomLevel`.
        // `baseScale` aligns PDF points to CSS pixels roughly.
        
        // Let's assume logic:
        // Text is rendered with `pixel size`. 
        // Available width in pixels = `canvasRect.width - (textMargin * currentScale * 2)`.
        // Wait, textMargin is in PDF points (px)? 
        // If user inputs "40px", does that mean 40px on the final PDF? Yes.
        // So we should scale the margin by `currentScale` to get screen pixels.
        
        const availableWidth = canvasRect.width - (textMargin * currentScale * 2);
        
        // Reset scale to measure natural width
        textElement.style.transform = `translate(-50%, -50%) scale(1)`; 
        const textWidth = textElement.scrollWidth;
        
        // Calculate scale
        let newScale = 1;
        if (textWidth > availableWidth && availableWidth > 0) {
            newScale = availableWidth / textWidth;
        }
        setFitScale(newScale);
        
        // Restore transform (managed by react render, but we need to trigger re-render or just set state)
    };
    
    measure();
  }, [previewText, fontSize, fontFamily, textMargin, currentScale, baseScale, zoomLevel]); // Dependencies

  // Load PDF Document
  useEffect(() => {
    if (!pdfFile) return;

    const loadPdf = async () => {
      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument(arrayBuffer);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };

    loadPdf();
  }, [pdfFile]);

  // Load Custom Font
  useEffect(() => {
    if (!customFont) {
        setFontFamily('sans-serif');
        return;
    }

    const loadFont = async () => {
        try {
            const fontName = 'CustomFont_' + Date.now();
            const buffer = await customFont.arrayBuffer();
            const fontFace = new FontFace(fontName, buffer);
            await fontFace.load();
            document.fonts.add(fontFace);
            setFontFamily(fontName);
        } catch (error) {
            console.error('Error loading font:', error);
        }
    };

    loadFont();
  }, [customFont]);

  // Render Page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      const page = await pdfDoc.getPage(1);
      
      const viewportOriginal = page.getViewport({ scale: 1 });
      const containerWidth = containerRef.current.clientWidth - 80;
      const containerHeight = containerRef.current.clientHeight - 80;
      
      const scaleX = containerWidth / viewportOriginal.width;
      const scaleY = containerHeight / viewportOriginal.height;
      const newBaseScale = Math.min(scaleX, scaleY, 1.2); 
      
      setBaseScale(newBaseScale);

      const viewport = page.getViewport({ scale: newBaseScale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      
      await page.render(renderContext).promise;
    };

    renderPage();
  }, [pdfDoc, containerRef.current?.clientWidth]); // Re-calculates base scale on resize logic roughly

  // Handlers
  const handleMouseDown = (e) => {
    // Check if clicking on text or background
    if (e.target.dataset.type === 'text') {
        setIsDraggingText(true);
    } else {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDraggingText) {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        // Since canvas is transformed, getBoundingClientRect gives the transformed size/pos.
        // We need the mouse position relative to the Top-Left of the transformed canvas.
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Normalize 0-1 based on current rendered width/height
        onPositionChange({
            x: Math.max(0, Math.min(x / rect.width, 1)),
            y: Math.max(0, Math.min(y / rect.height, 1))
        });
    } else if (isPanning) {
        setPan({
            x: e.clientX - panStart.x,
            y: e.clientY - panStart.y
        });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingText(false);
    setIsPanning(false);
  };

  return (
    <div 
        ref={containerRef}
        style={{ 
            flex: 1, 
            height: '100%', 
            background: 'var(--bg-color)', 
            position: 'relative',
            overflow: 'hidden',
            cursor: isPanning ? 'grabbing' : 'default'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      {!pdfFile && (
        <div style={{ 
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            color: 'var(--text-secondary)', textAlign: 'center' 
        }}>
            <p>No hay PDF cargado</p>
            <p style={{ fontSize: '0.8rem' }}>Sube una plantilla desde el panel lateral para comenzar</p>
        </div>
      )}

      {/* Toolbar */}
      {pdfFile && (
          <div style={{
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
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
              <button onClick={() => setZoomLevel(z => Math.max(0.2, z - 0.2))} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }} title="Alejar">
                  <ZoomOut size={20} />
              </button>
              <span style={{ minWidth: '3rem', textAlign: 'center', fontSize: '0.875rem' }}>{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => setZoomLevel(z => Math.min(4, z + 0.2))} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }} title="Acercar">
                  <ZoomIn size={20} />
              </button>
              <div style={{ width: '1px', background: 'var(--border-color)' }}></div>
              <button onClick={() => { setZoomLevel(1); setPan({ x: 0, y: 0 }); }} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }} title="Reiniciar Vista">
                  <RotateCcw size={18} />
              </button>
          </div>
      )}
      
      {/* Content Container with Transform */}
      <div 
        ref={contentRef}
        style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out'
        }}
      >
          <div style={{ position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <canvas ref={canvasRef} style={{ display: pdfFile ? 'block' : 'none', borderRadius: '4px' }} />
            
            {pdfFile && (
                <div
                    ref={textRef}
                    data-type="text"
                    style={{
                        position: 'absolute',
                        left: `${textPosition.x * 100}%`,
                        top: `${textPosition.y * 100}%`,
                        transform: `translate(-50%, -50%) scale(${fitScale})`, 
                        transformOrigin: 'center center',
                        fontSize: `${fontSize * currentScale}px`, // Adjust font size for baseScale * zoom
                        color: fontColor,
                        fontFamily: fontFamily,
                        whiteSpace: 'nowrap',
                        cursor: isDraggingText ? 'grabbing' : 'grab',
                        userSelect: 'none',
                        border: '1px dashed rgba(99, 102, 241, 0.5)',
                        padding: '4px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(2px)'
                    }}
                >
                    {previewText || "Nombre del Estudiante"}
                    {isUnderline && (
                        <div style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: '100%',
                            marginTop: `${underlineOffset * currentScale}px`, 
                            height: `${underlineThickness * currentScale}px`, 
                            backgroundColor: fontColor
                        }} />
                    )}
                </div>
            )}
          </div>
      </div>
    </div>
  );
}
