import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { WorkArea } from './components/WorkArea';
import { generateZip } from './utils/pdfGenerator';
import { clamp } from './utils/clamp';
import { isValidHexColor } from './utils/parseColor';
import { countDescriptions, parseStudents } from './utils/names';
import {
  DESCRIPTION_LAYER,
  LAYER_KEYS,
  LAYER_LABELS,
  NAME_LAYER,
  createDefaultLayers,
  updateLayer,
} from './utils/layers';
import './index.css';

const DEFAULT_POSITION = { x: 0.5, y: 0.5 };
const PDF_EXTENSIONS = ['.pdf'];
const FONT_EXTENSIONS = ['.ttf', '.otf', '.woff'];
const MAX_LISTED_FAILURES = 5;

function hasExtension(file, extensions) {
  const name = file.name.toLowerCase();
  return extensions.some((extension) => name.endsWith(extension));
}

// First reason the export cannot run yet, shown under the export button.
function findExportBlocker({ pdfFile, students, layers }) {
  if (!pdfFile) return 'Sube una plantilla PDF para continuar.';
  if (students.length === 0) return 'Agrega al menos un estudiante.';

  const invalidColorLayer = LAYER_KEYS.find(
    (key) => layers[key].enabled && !isValidHexColor(layers[key].color),
  );
  if (invalidColorLayer) {
    return `El color de «${LAYER_LABELS[invalidColorLayer]}» debe ser hexadecimal, p. ej. #1a2b3c.`;
  }

  return null;
}

export default function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [studentsText, setStudentsText] = useState('');
  const [layers, setLayers] = useState(createDefaultLayers);
  const [activeLayer, setActiveLayer] = useState(NAME_LAYER);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(null);
  const [notice, setNotice] = useState(null);

  const students = parseStudents(studentsText);
  const descriptionCount = countDescriptions(students);
  const previewStudent = students[0] ?? { name: '', description: '' };
  const exportBlocker = findExportBlocker({ pdfFile, students, layers });

  const handleLayerChange = (key, patch) => {
    setLayers((current) => updateLayer(current, key, patch));
  };

  const handleLayerPositionChange = (key, next) => {
    setLayers((current) => updateLayer(current, key, {
      position: {
        x: clamp(Number.isFinite(next.x) ? next.x : DEFAULT_POSITION.x, 0, 1),
        y: clamp(Number.isFinite(next.y) ? next.y : DEFAULT_POSITION.y, 0, 1),
      },
    }));
  };

  const handlePdfFile = (file) => {
    if (!hasExtension(file, PDF_EXTENSIONS)) {
      setNotice({ tone: 'error', title: `«${file.name}» no es un PDF.` });
      return;
    }
    setNotice(null);
    setPdfFile(file);
  };

  const handleLayerFontFile = (key, file) => {
    if (!hasExtension(file, FONT_EXTENSIONS)) {
      setNotice({ tone: 'error', title: 'La fuente debe ser un archivo .ttf, .otf o .woff.' });
      return;
    }
    setNotice(null);
    handleLayerChange(key, { customFont: file });
  };

  const handleExport = async () => {
    if (exportBlocker || isGenerating) return;

    if (layers[DESCRIPTION_LAYER].enabled && descriptionCount === 0) {
      const shouldContinue = window.confirm(
        'Activaste la descripción pero ningún estudiante tiene una. ¿Continuar?',
      );
      if (!shouldContinue) return;
    }

    setNotice(null);
    setIsGenerating(true);
    setProgress({ current: 0, total: students.length });

    try {
      const result = await generateZip({
        pdfFile,
        students,
        layers,
        onProgress: (current, total) => setProgress({ current, total }),
      });

      if (result.failures.length > 0) {
        const items = result.failures
          .slice(0, MAX_LISTED_FAILURES)
          .map((failure) => `${failure.name}: ${failure.message}`);
        if (result.failures.length > MAX_LISTED_FAILURES) items.push('…');

        setNotice({
          tone: 'error',
          title: `Se generaron ${result.succeeded} de ${result.total} diplomas.`,
          items,
        });
      } else {
        setNotice({
          tone: 'success',
          title: `${result.succeeded} ${result.succeeded === 1 ? 'diploma generado' : 'diplomas generados'}.`,
        });
      }
    } catch (error) {
      console.error('Export failed:', error);
      setNotice({ tone: 'error', title: 'Error al generar los PDFs. Revisa la consola para más detalles.' });
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  return (
    <div className="app">
      <main className="workspace">
        <WorkArea
          pdfFile={pdfFile}
          onPdfFile={handlePdfFile}
          layers={layers}
          previewTexts={previewStudent}
          activeLayer={activeLayer}
          onSelectLayer={setActiveLayer}
          onLayerPositionChange={handleLayerPositionChange}
        />
      </main>
      <Sidebar
        pdfFile={pdfFile}
        onPdfFile={handlePdfFile}
        studentsText={studentsText}
        setStudentsText={setStudentsText}
        studentsCount={students.length}
        descriptionCount={descriptionCount}
        layers={layers}
        activeLayer={activeLayer}
        onSelectLayer={setActiveLayer}
        onLayerChange={handleLayerChange}
        onLayerPositionChange={handleLayerPositionChange}
        onLayerFontFile={handleLayerFontFile}
        onExport={handleExport}
        isGenerating={isGenerating}
        progress={progress}
        exportBlocker={exportBlocker}
        notice={notice}
        onDismissNotice={() => setNotice(null)}
      />
    </div>
  );
}
