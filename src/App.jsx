import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { WorkArea } from './components/WorkArea';
import { generateZip } from './utils/pdfGenerator';
import './index.css';

function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [customFont, setCustomFont] = useState(null);
  const [names, setNames] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 0.5, y: 0.5 }); // Normalized 0-1
  const [fontSize, setFontSize] = useState(24);
  const [fontColor, setFontColor] = useState('#000000');
  const [isUnderline, setIsUnderline] = useState(false);
  const [underlineOffset, setUnderlineOffset] = useState(5);
  const [underlineThickness, setUnderlineThickness] = useState(2);
  const [textMargin, setTextMargin] = useState(40);
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePdfUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleFontUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCustomFont(e.target.files[0]);
    }
  };

  const handleExport = async () => {
    if (!pdfFile) {
        alert('Por favor sube una plantilla PDF primero.');
        return;
    }
    if (!names.trim()) {
        alert('Por favor ingresa al menos un nombre.');
        return;
    }

    setIsGenerating(true);
    try {
        const namesList = names.split('\n').map(n => n.trim()).filter(n => n);
        await generateZip({
            pdfFile,
            customFont,
            names: namesList,
            textPosition,
            fontSize,
            fontColor,
            isUnderline,
            underlineOffset,
            underlineThickness,
            textMargin
        });
    } catch (error) {
        console.error("Export failed:", error);
        alert('Error al generar PDFs. Ver consola para detalles.');
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <main style={{ flex: 1, position: 'relative', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <WorkArea 
          pdfFile={pdfFile}
          customFont={customFont}
          textPosition={textPosition}
          onPositionChange={setTextPosition}
          previewText={names.split('\n')[0] || "Nombre del Estudiante"}
          fontSize={fontSize}
          fontColor={fontColor}
          isUnderline={isUnderline}
          underlineOffset={underlineOffset}
          underlineThickness={underlineThickness}
          textMargin={textMargin}
        />
      </main>
      <Sidebar 
        onPdfUpload={handlePdfUpload}
        onFontUpload={handleFontUpload}
        names={names}
        setNames={setNames}
        fontSize={fontSize}
        setFontSize={setFontSize}
        fontColor={fontColor}
        setFontColor={setFontColor}
        isUnderline={isUnderline}
        setIsUnderline={setIsUnderline}
        underlineOffset={underlineOffset}
        setUnderlineOffset={setUnderlineOffset}
        underlineThickness={underlineThickness}
        setUnderlineThickness={setUnderlineThickness}
        textMargin={textMargin}
        setTextMargin={setTextMargin}
        textPosition={textPosition}
        onPositionChange={setTextPosition}
        onExport={handleExport}
        isGenerating={isGenerating}
      />
    </div>
  );
}

export default App;
