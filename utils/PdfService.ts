import { Quote, User } from '../types';
import { PdfTemplate } from './PdfTemplate';

declare const html2pdf: any;

export class PdfGenerator {
  /**
   * Generuje i pobiera plik PDF na urządzeniu
   */
  static async download(quote: Quote, user: User | null): Promise<void> {
    if (typeof html2pdf === 'undefined') {
      console.error('html2pdf.js is not loaded. Please include it in your project.');
      return;
    }

    // Tworzymy element w pamięci, który zostanie przetworzony na PDF
    const element = document.createElement('div');
    element.innerHTML = PdfTemplate.build(quote, user);
    
    // Opcjonalne: jeśli chcesz stylować czcionki Google w PDF, 
    // upewnij się, że element jest przez chwilę w DOM
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    document.body.appendChild(element);

    const options = {
      margin: [0, 0, 0, 0], // Marginesy zdefiniowane wewnątrz kontenera PDF
      filename: `Wycena_${quote.number.replace(/\//g, '_')}_${quote.clientLastName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        logging: false 
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      }
    };

    try {
      await html2pdf().set(options).from(element).save();
    } catch (error) {
      console.error('Błąd podczas generowania PDF:', error);
      throw error;
    } finally {
      // Sprzątanie DOM
      document.body.removeChild(element);
    }
  }
}