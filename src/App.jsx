import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { WorkArea } from './components/WorkArea';
import { generateZip } from './utils/pdfGenerator';
import { clamp } from './utils/clamp';
import { countDescriptions, parseStudents } from './utils/names';
import {
  DESCRIPTION_LAYER,
  LAYER_KEYS,
  NAME_LAYER,
  createDefaultLayers,
  updateLayer,
} from './utils/layers';
import './index.css';

const DEFAULT_POSITION = { x: 0.5, y: 0.5 };

function isValidHexColor(value) {
  return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value ?? '').trim());
}

export default function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [studentsText, setStudentsText] = useState('');
  const [layers, setLayers] = useState(createDefaultLayers);
  const [activeLayer, setActiveLayer] = useState(NAME_LAYER);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(null);

  const students = parseStudents(studentsText);
  const previewStudent = students[0] ?? { name: '', description: '' };

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

  const handlePdfUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) setPdfFile(file);
  };

  const handleLayerFontUpload = (key, event) => {
    const file = event.target.files?.[0];
    if (file) handleLayerChange(key, { customFont: file });
  };

  const handleExport = async () => {
    if (!pdfFile) {
      alert('Por favor sube una plantilla PDF primero.');
      return;
    }
    if (students.length === 0) {
      alert('Por favor ingresa al menos un nombre.');
      return;
    }

    const invalidColorLayer = LAYER_KEYS.find(
      (key) => layers[key].enabled && !isValidHexColor(layers[key].color),
    );

    if (invalidColorLayer) {
      alert(
        `El color de la línea "${invalidColorLayer}" debe ser hexadecimal, por ejemplo #1a2b3c.`,
      );
      return;
    }

    if (layers[DESCRIPTION_LAYER].enabled && countDescriptions(students) === 0) {
      const shouldContinue = window.confirm(
        'Activaste la segunda línea pero ningún estudiante tiene descripción. ¿Continuar?',
      );
      if (!shouldContinue) return;
    }

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
        const rest = result.failures
          .slice(0, 5)
          .map((failure) => `• ${failure.name}: ${failure.message}`)
          .join('\n');
        const more = result.failures.length > 5 ? '\n…' : '';

        alert(
          `Se generaron ${result.succeeded} de ${result.total} diplomas.\n\n` +
            `No se pudieron generar:\n${rest}${more}`,
        );
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Error al generar PDFs. Ver consola para detalles.');
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <main
        style={{
          flex: 1,
          position: 'relative',
          background: '#020617',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <WorkArea
          pdfFile={pdfFile}
          layers={layers}
          previewTexts={previewStudent}
          activeLayer={activeLayer}
          onSelectLayer={setActiveLayer}
          onLayerPositionChange={handleLayerPositionChange}
        />
      </main>
      <Sidebar
        onPdfUpload={handlePdfUpload}
        studentsText={studentsText}
        setStudentsText={setStudentsText}
        studentsCount={students.length}
        descriptionCount={countDescriptions(students)}
        layers={layers}
        activeLayer={activeLayer}
        onSelectLayer={setActiveLayer}
        onLayerChange={handleLayerChange}
        onLayerPositionChange={handleLayerPositionChange}
        onLayerFontUpload={handleLayerFontUpload}
        onExport={handleExport}
        isGenerating={isGenerating}
        progress={progress}
      />
    </div>
  );
}
