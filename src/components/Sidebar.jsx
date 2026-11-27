import { CircleCheck, CircleAlert, Download, FileText, GraduationCap, LoaderCircle, Upload, X } from 'lucide-react';
import { FilePicker } from './FilePicker';
import { LayerControls } from './LayerControls';
import { DESCRIPTION_LAYER, LAYER_KEYS, LAYER_LABELS } from '../utils/layers';

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Section({ title, meta, children }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        {meta && <span className="section-meta">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

function TemplatePicker({ file, onFile }) {
  return (
    <FilePicker
      accept=".pdf,application/pdf"
      onFile={onFile}
      inputLabel="Plantilla PDF"
      className={`dropzone${file ? ' is-filled' : ''}`}
    >
      {file ? (
        <>
          <FileText size={18} className="dropzone-icon" aria-hidden />
          <span className="dropzone-text">
            <span className="dropzone-title" title={file.name}>{file.name}</span>
            <span className="dropzone-meta">{formatFileSize(file.size)}</span>
          </span>
          <span className="dropzone-action">Cambiar</span>
        </>
      ) : (
        <>
          <Upload size={18} className="dropzone-icon" aria-hidden />
          <span className="dropzone-text">
            <span className="dropzone-title">Subir plantilla PDF</span>
            <span className="dropzone-meta">Arrastra el archivo o haz clic</span>
          </span>
        </>
      )}
    </FilePicker>
  );
}

function Notice({ notice, onDismiss }) {
  const Icon = notice.tone === 'success' ? CircleCheck : CircleAlert;

  return (
    <div className={`notice notice-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
      <Icon size={16} className="notice-icon" aria-hidden />
      <div className="notice-body">
        <p className="notice-title">{notice.title}</p>
        {notice.items && (
          <ul className="notice-list">
            {notice.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        )}
      </div>
      <button type="button" className="icon-btn icon-btn-sm" onClick={onDismiss} aria-label="Cerrar aviso">
        <X size={14} />
      </button>
    </div>
  );
}

function ExportButton({ count, isGenerating, progress, disabled, onClick }) {
  const ratio = progress?.total ? progress.current / progress.total : 0;

  return (
    <button
      type="button"
      className="btn btn-primary btn-block btn-export"
      onClick={onClick}
      disabled={disabled}
      aria-busy={isGenerating}
      style={{ '--progress': ratio }}
    >
      {isGenerating ? (
        <>
          <LoaderCircle size={16} className="spin" aria-hidden />
          {progress ? `Generando ${progress.current} de ${progress.total}…` : 'Generando…'}
        </>
      ) : (
        <>
          <Download size={16} aria-hidden />
          {count > 0 ? `Exportar ${count} ${count === 1 ? 'diploma' : 'diplomas'}` : 'Exportar diplomas'}
        </>
      )}
    </button>
  );
}

export function Sidebar({
  pdfFile,
  onPdfFile,
  studentsText,
  setStudentsText,
  studentsCount,
  descriptionCount,
  layers,
  activeLayer,
  onSelectLayer,
  onLayerChange,
  onLayerPositionChange,
  onLayerFontFile,
  onExport,
  isGenerating,
  progress,
  exportBlocker,
  notice,
  onDismissNotice,
}) {
  const descriptionEnabled = layers[DESCRIPTION_LAYER].enabled;
  const studentsMeta = studentsCount > 0
    ? `${studentsCount}${descriptionEnabled ? ` · ${descriptionCount} con descripción` : ''}`
    : null;

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <span className="brand-mark" aria-hidden><GraduationCap size={16} /></span>
        <div>
          <h1 className="brand-title">Diplomas</h1>
          <p className="brand-subtitle">Generación en lote</p>
        </div>
      </header>

      <div className="sidebar-body">
        <Section title="Plantilla">
          <TemplatePicker file={pdfFile} onFile={onPdfFile} />
        </Section>

        <Section title="Estudiantes" meta={studentsMeta}>
          <textarea
            className="control textarea"
            aria-label="Lista de estudiantes"
            placeholder={'Ana Pérez; Ingeniera Industrial\nLuis Gómez; Contador Público'}
            value={studentsText}
            onChange={(event) => setStudentsText(event.target.value)}
            rows={6}
            spellCheck={false}
          />
          <p className="hint">
            Uno por línea. Separa la descripción con <kbd>;</kbd>
          </p>
        </Section>

        <Section title="Texto">
          <div className="segmented" role="tablist" aria-label="Línea de texto">
            {LAYER_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeLayer === key}
                className="segmented-item"
                onClick={() => onSelectLayer(key)}
              >
                {LAYER_LABELS[key]}
                {!layers[key].enabled && <span className="segmented-badge">Off</span>}
              </button>
            ))}
          </div>

          <div role="tabpanel" aria-label={LAYER_LABELS[activeLayer]}>
            <LayerControls
              layerKey={activeLayer}
              layers={layers}
              onLayerChange={(patch) => onLayerChange(activeLayer, patch)}
              onLayerPositionChange={(position) => onLayerPositionChange(activeLayer, position)}
              onFontFile={(file) => onLayerFontFile(activeLayer, file)}
            />
          </div>
        </Section>
      </div>

      <footer className="sidebar-footer">
        {notice && <Notice notice={notice} onDismiss={onDismissNotice} />}
        <ExportButton
          count={studentsCount}
          isGenerating={isGenerating}
          progress={progress}
          disabled={Boolean(exportBlocker) || isGenerating}
          onClick={onExport}
        />
        {exportBlocker && !isGenerating && <p className="hint hint-center">{exportBlocker}</p>}
      </footer>
    </aside>
  );
}
