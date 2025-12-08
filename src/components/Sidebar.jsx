import { Upload, Type, Users, Download, Palette, FileType, Move, AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter, Underline } from 'lucide-react';

export function Sidebar({ 
  onPdfUpload, 
  onFontUpload, 
  names, 
  setNames, 
  fontSize, 
  setFontSize,
  fontColor,
  setFontColor,
  isUnderline,
  setIsUnderline,
  underlineOffset,
  setUnderlineOffset,
  underlineThickness,
  setUnderlineThickness,
  textMargin,
  setTextMargin,
  textPosition,
  onPositionChange,
  onExport,
  isGenerating
}) {
  return (
    <aside style={{ 
      width: '350px', 
      background: 'var(--surface-color)', 
      borderLeft: '1px solid var(--border-color)', 
      display: 'flex', 
      flexDirection: 'column',
      height: '100%'
    }}>
      <header style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileType size={20} className='text-primary' color='var(--primary-color)' />
          Exportador de Diplomas
        </h2>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Generación de credenciales en lote
        </p>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* PDF Upload */}
        <section>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={16} /> PLANTILLA
          </h3>
          <div style={{ position: 'relative' }}>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={onPdfUpload}
              style={{ 
                width: '100%', 
                padding: '2rem 1rem', 
                border: '2px dashed var(--border-color)', 
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                textAlign: 'center',
                color: 'transparent'
              }} 
            />
            <div style={{ 
              position: 'absolute', 
              top: 0, left: 0, right: 0, bottom: 0, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              pointerEvents: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem'
            }}>
              Clic para subir PDF
            </div>
          </div>
        </section>

        {/* Font Upload */}
        <section>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Type size={16} /> FUENTE PERSONALIZADA
          </h3>
          <input 
            type="file" 
            accept=".ttf,.otf,.woff" 
            onChange={onFontUpload}
            style={{ width: '100%' }}
          />
        </section>

        {/* Position Controls */}
        <section>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Move size={16} /> POSICIÓN
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>X (%)</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                max="1"
                value={textPosition.x} 
                onChange={(e) => onPositionChange({ ...textPosition, x: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Y (%)</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                max="1"
                value={textPosition.y} 
                onChange={(e) => onPositionChange({ ...textPosition, y: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Margen Lateral (px)</label>
                <input 
                    type="number" 
                    min="0"
                    value={textMargin} 
                    onChange={(e) => setTextMargin(Number(e.target.value))}
                    style={{ width: '100%' }}
                />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button 
                  onClick={() => onPositionChange({ ...textPosition, x: 0.5 })}
                  title="Centrar Horizontalmente"
                  style={{ 
                    flex: 1, 
                    padding: '0.5rem', 
                    background: 'var(--surface-color)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius)', 
                    color: 'var(--text-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <AlignHorizontalJustifyCenter size={16} />
                </button>
                 <button 
                  onClick={() => onPositionChange({ ...textPosition, y: 0.5 })}
                  title="Centrar Verticalmente"
                  style={{ 
                    flex: 1, 
                    padding: '0.5rem', 
                    background: 'var(--surface-color)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius)', 
                    color: 'var(--text-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <AlignVerticalJustifyCenter size={16} />
                </button>
           </div>
        </section>

        {/* Text Settings */}
        <section>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Palette size={16} /> ESTILO
          </h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tamaño (px)</label>
              <input 
                type="number" 
                value={fontSize} 
                onChange={(e) => setFontSize(Number(e.target.value))}
                style={{ width: '100%', minWidth: '80px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Color & Estilo</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input 
                  type="color" 
                  value={fontColor} 
                  onChange={(e) => setFontColor(e.target.value)}
                  style={{ width: '40px', padding: 0, border: 'none', height: '38px', cursor: 'pointer', flexShrink: 0 }} 
                />
                <input 
                  type="text" 
                  value={fontColor} 
                  onChange={(e) => setFontColor(e.target.value)}
                  style={{ width: '90px', fontFamily: 'monospace' }} 
                />
                <button
                  onClick={() => setIsUnderline(!isUnderline)}
                  title="Subrayado"
                  style={{
                    height: '38px',
                    width: '38px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isUnderline ? 'var(--primary-color)' : 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                    color: isUnderline ? 'white' : 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                    <Underline size={18} />
                </button>
              </div>
            </div>
          </div>
          
          {isUnderline && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-color)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Espacio (px)</label>
                        <input 
                            type="number" 
                            value={underlineOffset} 
                            onChange={(e) => setUnderlineOffset(Number(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Grosor (px)</label>
                        <input 
                            type="number" 
                            min="1"
                            value={underlineThickness} 
                            onChange={(e) => setUnderlineThickness(Number(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>
            </div>
          )}
        </section>

        {/* Names Input */}
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={16} /> LISTA DE NOMBRES
          </h3>
          <textarea 
            placeholder="Ingresar nombres (uno por línea)" 
            value={names}
            onChange={(e) => setNames(e.target.value)}
            style={{ 
              width: '100%', 
              flex: 1, 
              minHeight: '150px', 
              resize: 'none',
              lineHeight: '1.5'
            }}
          />
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
            {names.split('\n').filter(n => n.trim()).length} nombres
          </div>
        </section>

      </div>

      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
        <button 
          onClick={onExport}
          disabled={isGenerating}
          style={{ 
            width: '100%', 
            padding: '1rem', 
            background: 'var(--primary-color)', 
            color: 'white', 
            border: 'none', 
            borderRadius: 'var(--radius)', 
            fontSize: '1rem', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            opacity: isGenerating ? 0.7 : 1
          }}
        >
          {isGenerating ? 'Generando...' : <><Download size={20} /> Exportar PDFs en Lote</>}
        </button>
      </div>
    </aside>
  );
}
