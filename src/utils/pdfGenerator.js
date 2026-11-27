import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import JSZip from 'jszip';
import { createFileNameFactory } from './fileName.js';
import { parseColor } from './parseColor.js';
import { drawStudentLayers, embedDocumentFont } from './drawDiplomaText.js';

function yieldToEventLoop() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function readLayerFontBytes(layers) {
  const nameBytes = layers.name.customFont
    ? await layers.name.customFont.arrayBuffer()
    : null;

  const usesOwnDescriptionFont =
    layers.description.enabled &&
    layers.description.customFont &&
    layers.description.customFont !== layers.name.customFont;

  // The description inherits the name font unless it has its own upload.
  const descriptionBytes = usesOwnDescriptionFont
    ? await layers.description.customFont.arrayBuffer()
    : nameBytes;

  return { nameBytes, descriptionBytes };
}

export async function generateZip({
  pdfFile,
  students,
  layers,
  onProgress,
}) {
  const zip = new JSZip();
  const pdfBytes = await pdfFile.arrayBuffer();
  const { nameBytes, descriptionBytes } = await readLayerFontBytes(layers);

  const colors = {
    name: parseColor(layers.name.color),
    description: parseColor(layers.description.color),
  };

  const nextFileName = createFileNameFactory();
  const failures = [];

  let succeeded = 0;

  for (const [index, student] of students.entries()) {
    const label = student.name || student.description;

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      pdfDoc.registerFontkit(fontkit);

      const nameFont = await embedDocumentFont(pdfDoc, nameBytes);
      const descriptionFont = descriptionBytes === nameBytes
        ? nameFont
        : await embedDocumentFont(pdfDoc, descriptionBytes);

      drawStudentLayers(pdfDoc.getPages()[0], {
        student,
        layers,
        fonts: { name: nameFont, description: descriptionFont },
        colors,
      });

      zip.file(nextFileName(label), await pdfDoc.save());
      succeeded += 1;
    } catch (error) {
      failures.push({ name: label, message: error?.message ?? String(error) });
    }

    onProgress?.(index + 1, students.length);
    await yieldToEventLoop();
  }

  if (succeeded > 0) {
    downloadBlob(await zip.generateAsync({ type: 'blob' }), 'diplomas.zip');
  }

  return { total: students.length, succeeded, failures };
}
