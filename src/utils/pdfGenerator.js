import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import JSZip from 'jszip';

export async function generateZip({ 
  pdfFile, 
  customFont, 
  names, 
  textPosition, 
  fontSize, 
  fontColor, 
  isUnderline,
  underlineOffset = 5,
  underlineThickness = 2,
  textMargin = 40
}) {
  const zip = new JSZip();
  const pdfBytes = await pdfFile.arrayBuffer();
  let fontBytes = null;

  if (customFont) {
    fontBytes = await customFont.arrayBuffer();
  }

  // Parse hex color
  const r = parseInt(fontColor.slice(1, 3), 16) / 255;
  const g = parseInt(fontColor.slice(3, 5), 16) / 255;
  const b = parseInt(fontColor.slice(5, 7), 16) / 255;
  const pdfColor = rgb(r, g, b);

  for (const name of names) {
    // We load the PDF for each iteration to get a fresh instance
    // Alternatively, we could load it once and copy pages, but loading fresh is safer for isolation
    // and performance is usually acceptable for client-side batching of ~100s.
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Register fontkit
    pdfDoc.registerFontkit(fontkit);

    let font;
    if (fontBytes) {
      font = await pdfDoc.embedFont(fontBytes);
    } else {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Calculate coordinates
    // textPosition is normalized (0-1) from top-left
    // PDF coordinates are from bottom-left
    const x = textPosition.x * width;
    const y = (1 - textPosition.y) * height;

    // Center logic:
    const textWidth = font.widthOfTextAtSize(name, fontSize);
    const textHeight = font.heightAtSize(fontSize); 
    
    // Auto-fit logic
    let currentFontSize = fontSize;
    let currentTextWidth = textWidth;
    
    // Calculate max available width
    // margin is applied to both sides conceptually, or from page edges?
    // "Margin" usually means minimum distance from page edge.
    // Max width = PageWidth - (Margin * 2)
    const maxTextWidth = width - (textMargin * 2);
    
    if (textWidth > maxTextWidth && maxTextWidth > 0) {
        const scaleFactor = maxTextWidth / textWidth;
        currentFontSize = fontSize * scaleFactor;
        currentTextWidth = maxTextWidth;
    }

    const drawX = x - (currentTextWidth / 2);
    // Adjust Y to center vertically on the point, using scaled height
    const scaledTextHeight = font.heightAtSize(currentFontSize);
    const drawY = y - (scaledTextHeight / 4); 

    firstPage.drawText(name, {
        x: drawX,
        y: drawY,
        size: currentFontSize,
        font,
        color: pdfColor,
    });

    if (isUnderline) {
        // Draw underline rectangle
        // drawY is roughly the baseline.
        // HTML bottom is roughly baseline - descent.
        // We want to match HTML visual, so we start offset from "text bottom" (below baseline).
        const descent = currentFontSize * 0.25; // Approx descent
        const rectY = drawY - descent - underlineOffset - underlineThickness;
        
        firstPage.drawRectangle({
            x: drawX,
            y: rectY,
            width: currentTextWidth, // Use scaled width
            height: underlineThickness,
            color: pdfColor,
        });
    }

    const pdfOutBytes = await pdfDoc.save();
    zip.file(`${name}.pdf`, pdfOutBytes);
  }

  const content = await zip.generateAsync({ type: "blob" });
  
  // Trigger download
  const link = document.createElement("a");
  link.href = URL.createObjectURL(content);
  link.download = "diplomas.zip";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
