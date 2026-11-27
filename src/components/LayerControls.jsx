import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Type,
  X,
} from 'lucide-react';
import { FilePicker } from './FilePicker';
import { clamp } from '../utils/clamp';
import { normalizeHexColor } from '../utils/parseColor';
import { DESCRIPTION_LAYER, NAME_LAYER, resolveLayerFont } from '../utils/layers';

const PERCENT_STEP = 0.1;

const FONT_SOURCE_LABELS = {
  own: 'Personalizada',
  inherited: 'Igual que el nombre',
  default: 'Predeterminada',
};

function percentInputValue(value) {
  return Math.round(value * 1000) / 10;
}

function toNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return clamp(parsed, min, max);
}

function NumberField({ label, suffix, value, min = 0, max = Infinity, step, onChange }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="affix">
        <input
          className="control"
          type="number"
          inputMode="decimal"
          min={Number.isFinite(min) ? min : undefined}
          max={Number.isFinite(max) ? max : undefined}
          step={step}
          value={value}
          onChange={(event) => {
            if (event.target.value === '') return;
            onChange(toNumber(event.target.value, value, min, max));
          }}
        />
        {suffix && <span className="affix-suffix" aria-hidden>{suffix}</span>}
      </span>
    </label>
  );
}

function ColorField({ value, onChange }) {
  const normalized = normalizeHexColor(value);

  return (
    <div className="field">
      <span className="field-label">Color</span>
      <span className="affix affix-color">
        <input
          type="color"
          className="swatch"
          aria-label="Elegir color"
          value={normalized ?? '#000000'}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          type="text"
          className="control mono"
          aria-label="Color hexadecimal"
          aria-invalid={!normalized}
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </div>
  );
}

function Switch({ checked, onChange, label }) {
  return (
    <input
      type="checkbox"
      role="switch"
      className="switch"
      aria-label={label}
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
  );
}

function Group({ title, action, children }) {
  return (
    <div className="group">
      <div className="group-head">
        <span className="group-title">{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

export function LayerControls({
  layerKey,
  layers,
  onLayerChange,
  onLayerPositionChange,
  onFontFile,
}) {
  const layer = layers[layerKey];
  const font = resolveLayerFont(layers, layerKey);
  const isDescription = layerKey === DESCRIPTION_LAYER;

  const nameFontIsShared =
    layerKey === NAME_LAYER &&
    layers[DESCRIPTION_LAYER].enabled &&
    resolveLayerFont(layers, DESCRIPTION_LAYER).source === 'inherited';

  const setPosition = (patch) => {
    onLayerPositionChange({ ...layer.position, ...patch });
  };

  const enabledSwitch = isDescription && (
    <label className="switch-row">
      <span>
        <span className="switch-row-title">Mostrar descripción</span>
        <span className="switch-row-hint">Segunda línea bajo el nombre</span>
      </span>
      <Switch
        label="Mostrar descripción"
        checked={layer.enabled}
        onChange={(enabled) => onLayerChange({ enabled })}
      />
    </label>
  );

  if (isDescription && !layer.enabled) {
    return <div className="stack">{enabledSwitch}</div>;
  }

  return (
    <div className="stack">
      {enabledSwitch}

      <Group title="Tipografía">
        <div className="font-row">
          <span className="font-icon" aria-hidden><Type size={14} /></span>
          <span className="font-info">
            <span className="font-name" title={font.file?.name}>{font.file?.name ?? 'Helvetica'}</span>
            <span className="font-source">{FONT_SOURCE_LABELS[font.source]}</span>
          </span>
          {font.source === 'own' && (
            <button
              type="button"
              className="icon-btn icon-btn-sm"
              onClick={() => onLayerChange({ customFont: null })}
              title={isDescription ? 'Usar la fuente del nombre' : 'Quitar fuente'}
              aria-label={isDescription ? 'Usar la fuente del nombre' : 'Quitar fuente'}
            >
              <X size={14} />
            </button>
          )}
          <FilePicker
            accept=".ttf,.otf,.woff"
            onFile={onFontFile}
            inputLabel="Subir fuente"
            className="btn btn-sm"
          >
            {font.source === 'own' ? 'Cambiar' : 'Subir'}
          </FilePicker>
        </div>
        {isDescription && font.source === 'inherited' && (
          <p className="hint">Sube una fuente para usar otra solo en la descripción.</p>
        )}
        {nameFontIsShared && <p className="hint">También se aplica a la descripción.</p>}

        <div className="grid-2">
          <NumberField
            label="Tamaño"
            suffix="px"
            value={layer.fontSize}
            min={1}
            onChange={(value) => onLayerChange({ fontSize: value })}
          />
          <ColorField value={layer.color} onChange={(color) => onLayerChange({ color })} />
        </div>
      </Group>

      <Group title="Posición">
        <div className="grid-position">
          <NumberField
            label="X"
            suffix="%"
            value={percentInputValue(layer.position.x)}
            min={0}
            max={100}
            step={PERCENT_STEP}
            onChange={(value) => setPosition({ x: value / 100 })}
          />
          <NumberField
            label="Y"
            suffix="%"
            value={percentInputValue(layer.position.y)}
            min={0}
            max={100}
            step={PERCENT_STEP}
            onChange={(value) => setPosition({ y: value / 100 })}
          />
          <div className="button-group">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setPosition({ x: 0.5 })}
              title="Centrar horizontalmente"
              aria-label="Centrar horizontalmente"
            >
              <AlignHorizontalJustifyCenter size={16} />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setPosition({ y: 0.5 })}
              title="Centrar verticalmente"
              aria-label="Centrar verticalmente"
            >
              <AlignVerticalJustifyCenter size={16} />
            </button>
          </div>
        </div>
        <NumberField
          label="Margen lateral"
          suffix="px"
          value={layer.margin}
          onChange={(value) => onLayerChange({ margin: value })}
        />
      </Group>

      <Group
        title="Subrayado"
        action={(
          <Switch
            label="Subrayado"
            checked={layer.isUnderline}
            onChange={(isUnderline) => onLayerChange({ isUnderline })}
          />
        )}
      >
        {layer.isUnderline && (
          <div className="grid-2">
            <NumberField
              label="Espacio"
              suffix="px"
              value={layer.underlineOffset}
              onChange={(value) => onLayerChange({ underlineOffset: value })}
            />
            <NumberField
              label="Grosor"
              suffix="px"
              value={layer.underlineThickness}
              min={1}
              onChange={(value) => onLayerChange({ underlineThickness: value })}
            />
          </div>
        )}
      </Group>
    </div>
  );
}
