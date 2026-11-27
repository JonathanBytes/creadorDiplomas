import { Download, FileType, Layers, Upload, Users } from 'lucide-react';
import { LayerControls } from './LayerControls';
import {
  DESCRIPTION_LAYER,
  LAYER_KEYS,
  LAYER_LABELS,
  NAME_LAYER,
} from '../utils/layers';

const SECTION_TITLE_STYLE = {
  fontSize: '0.875rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '0.75rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

function LayerTab({ layerKey, isActive, isEnabled, onSelect }) {
  return (
    <button
      onClick={() => onSelect(layerKey)}
      style={{
        flex: 1,
        padding: '0.5rem 0.75rem',
        background: isActive ? 'var(--primary-color)' : 'var(--bg-color)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius)',
        color: isActive ? 'white' : 'var(--text-primary)',
        fontWeight: 600,
        opacity: isEnabled ? 1 : 0.55,
      }}
    >
      {LAYER_LABELS[layerKey]}
    </button>
  );
}

export function Sidebar({
  onPdfUpload,
  studentsText,
  setStudentsText,
  studentsCount,
  descriptionCount,
  layers,
  activeLayer,
  onSelectLayer,
  onLayerChange,
  onLayerPositionChange,
  onLayerFontUpload,
  onExport,
  isGenerating,
  progress,
}) {
  const toggleDescription = (enabled) => {
    onLayerChange(DESCRIPTION_LAYER, { enabled });
    if (enabled) {
      onSelectLayer(DESCRIPTION_LAYER);
    } else if (activeLayer === DESCRIPTION_LAYER) {
      onSelectLayer(NAME_LAYER);
    }
  };

  return (
    <aside style={{
      width: '350px',
      background: 'var(--surface-color)',
      borderLeft: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
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
          <h3 style={SECTION_TITLE_STYLE}>
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
                color: 'transparent',
              }}
            />
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
            }}>
              Clic para subir PDF
            </div>
          </div>
        </section>

        {/* Text layers */}
        <section>
          <h3 style={SECTION_TITLE_STYLE}>
            <Layers size={16} /> LÍNEAS DE TEXTO
          </h3>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            marginBottom: '0.75rem',
            background: 'var(--bg-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius)',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={layers[DESCRIPTION_LAYER].enabled}
              onChange={(event) => toggleDescription(event.target.checked)}
              style={{ width: 'auto', padding: 0 }}
            />
            Segunda línea (descripción)
          </label>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {LAYER_KEYS.map((key) => (
              <LayerTab
                key={key}
                layerKey={key}
                isActive={activeLayer === key}
                isEnabled={layers[key].enabled}
                onSelect={onSelectLayer}
              />
            ))}
          </div>

          <LayerControls
            layerKey={activeLayer}
            layers={layers}
            onLayerChange={(patch) => onLayerChange(activeLayer, patch)}
            onLayerPositionChange={(position) => onLayerPositionChange(activeLayer, position)}
            onLayerFontUpload={(event) => onLayerFontUpload(activeLayer, event)}
          />
        </section>

        {/* Students Input */}
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={SECTION_TITLE_STYLE}>
            <Users size={16} /> LISTA DE ESTUDIANTES
          </h3>
          <textarea
            placeholder={'Ana Pérez; Ingeniera Industrial\nLuis Gómez; Contador Público'}
            value={studentsText}
            onChange={(event) => setStudentsText(event.target.value)}
            style={{
              width: '100%',
              flex: 1,
              minHeight: '150px',
              resize: 'none',
              lineHeight: '1.5',
            }}
          />
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Formato: Nombre; Descripción (una por línea)
          </p>
          <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
            {studentsCount} estudiantes · {descriptionCount} con descripción
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
            opacity: isGenerating ? 0.7 : 1,
          }}
        >
          {isGenerating
            ? (progress ? `Generando ${progress.current}/${progress.total}…` : 'Generando...')
            : <><Download size={20} /> Exportar PDFs en Lote</>}
        </button>
      </div>
    </aside>
  );
}
