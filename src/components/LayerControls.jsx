import { useRef } from 'react';
import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Move,
  Palette,
  Type,
  Underline,
  Upload,
} from 'lucide-react';
import { clamp } from '../utils/clamp';
import { DESCRIPTION_LAYER, LAYER_LABELS, NAME_LAYER, resolveLayerFont } from '../utils/layers';

const PERCENT_STEP = 0.1;

const LABEL_STYLE = {
  display: 'block',
  marginBottom: '0.5rem',
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
};

const SECTION_TITLE_STYLE = {
  fontSize: '0.875rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '0.75rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const HINT_STYLE = {
  margin: '0.5rem 0 0',
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
};

const BUTTON_STYLE = {
  flex: 1,
  padding: '0.5rem',
  background: 'var(--surface-color)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius)',
  color: 'var(--text-primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
};

function percentInputValue(value) {
  return Math.round(value * 1000) / 10;
}

function toNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return clamp(parsed, min, max);
}

function describeFont(font) {
  if (font.source === 'own') return `Personalizada: ${font.file.name}`;
  if (font.source === 'inherited') return `Igual que el nombre: ${font.file.name}`;
  return 'Helvetica (por defecto)';
}

function NumberField({ label, value, min = 0, max = Infinity, step, onChange }) {
  return (
    <div>
      <label style={LABEL_STYLE}>{label}</label>
      <input
        type="number"
        min={Number.isFinite(min) ? min : undefined}
        max={Number.isFinite(max) ? max : undefined}
        step={step}
        value={value}
        onChange={(event) => {
          if (event.target.value === '') return;
          onChange(toNumber(event.target.value, value, min, max));
        }}
        style={{ width: '100%' }}
      />
    </div>
  );
}

export function LayerControls({
  layerKey,
  layers,
  onLayerChange,
  onLayerPositionChange,
  onLayerFontUpload,
}) {
  const layer = layers[layerKey];
  const font = resolveLayerFont(layers, layerKey);
  const fileInputRef = useRef(null);

  const nameFontIsShared =
    layerKey === NAME_LAYER &&
    layers[DESCRIPTION_LAYER].enabled &&
    resolveLayerFont(layers, DESCRIPTION_LAYER).source === 'inherited';

  const setPosition = (patch) => {
    onLayerPositionChange({ ...layer.position, ...patch });
  };

  const handleFontFileChange = (event) => {
    onLayerFontUpload(event);
    // Clear the picker so choosing the same file again still fires onChange.
    event.target.value = '';
  };

  return (
    <>
      <section>
        <h3 style={SECTION_TITLE_STYLE}>
          <Type size={16} /> FUENTE · {LAYER_LABELS[layerKey].toUpperCase()}
        </h3>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem' }}>
          {describeFont(font)}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={BUTTON_STYLE}
          >
            <Upload size={16} /> Subir fuente…
          </button>
          {font.source === 'own' && (
            <button
              type="button"
              onClick={() => onLayerChange({ customFont: null })}
              style={BUTTON_STYLE}
            >
              {layerKey === DESCRIPTION_LAYER ? 'Usar la del nombre' : 'Quitar fuente'}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".ttf,.otf,.woff"
          onChange={handleFontFileChange}
          hidden
        />
        {layerKey === DESCRIPTION_LAYER && font.source === 'inherited' && (
          <p style={HINT_STYLE}>
            Sin fuente propia: sigue a la del nombre. Sube una fuente para usar otra solo aquí.
          </p>
        )}
        {nameFontIsShared && (
          <p style={HINT_STYLE}>También se aplica a la descripción, que no tiene fuente propia.</p>
        )}
      </section>

      <section>
        <h3 style={SECTION_TITLE_STYLE}>
          <Move size={16} /> POSICIÓN
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <NumberField
            label="X (%)"
            value={percentInputValue(layer.position.x)}
            min={0}
            max={100}
            step={PERCENT_STEP}
            onChange={(value) => setPosition({ x: value / 100 })}
          />
          <NumberField
            label="Y (%)"
            value={percentInputValue(layer.position.y)}
            min={0}
            max={100}
            step={PERCENT_STEP}
            onChange={(value) => setPosition({ y: value / 100 })}
          />
          <div style={{ gridColumn: '1 / -1' }}>
            <NumberField
              label="Margen Lateral (px)"
              value={layer.margin}
              onChange={(value) => onLayerChange({ margin: value })}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            onClick={() => setPosition({ x: 0.5 })}
            title="Centrar Horizontalmente"
            style={BUTTON_STYLE}
          >
            <AlignHorizontalJustifyCenter size={16} />
          </button>
          <button
            onClick={() => setPosition({ y: 0.5 })}
            title="Centrar Verticalmente"
            style={BUTTON_STYLE}
          >
            <AlignVerticalJustifyCenter size={16} />
          </button>
        </div>
      </section>

      <section>
        <h3 style={SECTION_TITLE_STYLE}>
          <Palette size={16} /> ESTILO
        </h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <NumberField
              label="Tamaño (px)"
              value={layer.fontSize}
              min={1}
              onChange={(value) => onLayerChange({ fontSize: value })}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Color & Estilo</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="color"
                value={layer.color}
                onChange={(event) => onLayerChange({ color: event.target.value })}
                style={{ width: '40px', padding: 0, border: 'none', height: '38px', cursor: 'pointer', flexShrink: 0 }}
              />
              <input
                type="text"
                value={layer.color}
                onChange={(event) => onLayerChange({ color: event.target.value })}
                style={{ width: '90px', fontFamily: 'monospace' }}
              />
              <button
                onClick={() => onLayerChange({ isUnderline: !layer.isUnderline })}
                title="Subrayado"
                style={{
                  height: '38px',
                  width: '38px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: layer.isUnderline ? 'var(--primary-color)' : 'var(--bg-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius)',
                  color: layer.isUnderline ? 'white' : 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                <Underline size={18} />
              </button>
            </div>
          </div>
        </div>

        {layer.isUnderline && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-color)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <NumberField
                label="Espacio (px)"
                value={layer.underlineOffset}
                onChange={(value) => onLayerChange({ underlineOffset: value })}
              />
              <NumberField
                label="Grosor (px)"
                value={layer.underlineThickness}
                min={1}
                onChange={(value) => onLayerChange({ underlineThickness: value })}
              />
            </div>
          </div>
        )}
      </section>
    </>
  );
}
