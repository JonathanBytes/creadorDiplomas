import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Move,
  Palette,
  Type,
  Underline,
} from 'lucide-react';
import { clamp } from '../utils/clamp';

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
};

function percentInputValue(value) {
  return Math.round(value * 1000) / 10;
}

function toNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return clamp(parsed, min, max);
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
  layer,
  onLayerChange,
  onLayerPositionChange,
  onLayerFontUpload,
}) {
  const setPosition = (patch) => {
    onLayerPositionChange({ ...layer.position, ...patch });
  };

  return (
    <>
      <section>
        <h3 style={SECTION_TITLE_STYLE}>
          <Type size={16} /> FUENTE
        </h3>
        <input
          type="file"
          accept=".ttf,.otf,.woff"
          onChange={onLayerFontUpload}
          style={{ width: '100%' }}
        />
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {layer.customFont ? layer.customFont.name : 'Fuente por defecto (Helvetica)'}
        </p>
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
