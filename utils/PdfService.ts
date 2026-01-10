
import { Quote, User } from '../types';
import { FinanceUtils } from './FinanceUtils';

declare const html2pdf: any;

/**
 * Klasa odpowiedzialna za strukturę wizualną dokumentu
 */
class PdfTemplate {
  static getStyles(color: string) {
    return `
      <style>
        .pdf-container { width: 210mm; min-height: 297mm; padding: 15mm; box-sizing: border-box; background: #fff; color: #1e293b; font-family: 'Inter', sans-serif; font-size: 11px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid ${color}; padding-bottom: 8mm; margin-bottom: 10mm; }
        .logo-box { height: 20mm; width: 20mm; background: ${color}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; border-radius: 4px; text-transform: uppercase; font-style: italic; }
        .grid-data { display: grid; grid-template-columns: 1fr 1fr; gap: 20mm; margin: 10mm 0; }
        .label { font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 1px; }
        .label-theme { color: ${color}; }
        .table { width: 100%; border-collapse: collapse; margin: 10mm 0; }
        .table th { text-align: left; padding: 3mm 0; border-bottom: 2px solid #0f172a; font-size: 9px; text-transform: uppercase; color: #64748b; }
        .table td { padding: 4mm 0; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        .summary-box { width: 100mm; background: #f8fafc; padding: 6mm; border-radius: 12px; border: 1px solid #e2e8f0; margin-left: auto; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 2mm; font-size: 9px; }
        .total-row { display: flex; justify-content: space-between; border-top: 2px solid #0f172a; margin-top: 4mm; padding-top: 4mm; align-items: center; }
        .total-val { font-size: 22px; font-weight: 900; color: #0f172a; }
      </style>
    `;
  }

  static build(quote: Quote, user: User | null, color: string): string {
    const totals = FinanceUtils.getQuoteTotals(quote.items);
    const hasLogo = !!user?.logo;

    const itemsHtml = quote.items.map((item, idx) => {
      const labor = FinanceUtils.calculateItemLabor(item);
      const materials = FinanceUtils.calculateItemMaterials(item);
      const itemHasMats = materials > 0;

      return `
        <tr>
          <td style="color: #94a3b8;">${idx + 1}.</td>
          <td>
            <div style="font-weight: 800;">${item.name}</div>
            ${itemHasMats ? `<div style="font-size: 8px; color: #64748b; margin-top: 1mm;">Materiały: ${materials.toLocaleString()} zł</div>` : ''}
          </td>
          <td style="text-align: center;">${item.unit}</td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">${item.netPrice.toLocaleString()} zł</td>
          <td style="text-align: right; font-weight: 800;">${labor.toLocaleString()} zł</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="pdf-container">
        ${this.getStyles(color)}
        <div class="header">
          <div style="display: flex; gap: 15px; align-items: center;">
            ${hasLogo ? `<img src="${user?.logo}" style="height: 25mm; width: 25mm; object-fit: contain;" />` : `<div class="logo-box">Q</div>`}
            <div>
              <h2 style="margin:0; font-size:18px;">${user?.companyName || 'Twoja Firma'}</h2>
              <div class="label">Oferta i Kosztorys</div>
            </div>
          </div>
          <div style="text-align: right;">
            <h1 style="margin:0; font-size: 24px;">${quote.number}</h1>
            <div style="margin-top:2mm; font-size: 9px;">Data: ${quote.date}</div>
          </div>
        </div>

        <div class="grid-data">
          <div>
            <div class="label label-theme">Wykonawca</div>
            <div style="font-weight:800; font-size: 12px;">${user?.firstName} ${user?.lastName}</div>
            <div>${user?.address}</div>
            <div>${user?.postalCode} ${user?.city}</div>
            ${user?.nip ? `<div style="font-weight:700; margin-top:2mm;">NIP: ${user?.nip}</div>` : ''}
          </div>
          <div>
            <div class="label">Zleceniodawca</div>
            <div style="font-weight:800; font-size: 12px;">${quote.clientFirstName} ${quote.clientLastName}</div>
            <div>${quote.serviceStreet} ${quote.serviceHouseNo}${quote.serviceApartmentNo ? '/' + quote.serviceApartmentNo : ''}</div>
            <div>${quote.servicePostalCode} ${quote.serviceCity}</div>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Poz.</th><th>Zakres prac</th><th style="text-align:center;">J.M.</th><th style="text-align:center;">Ilość</th><th style="text-align:right;">Cena j.m.</th><th style="text-align:right;">Wartość rob.</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div class="summary-box">
          <div class="summary-row"><span>Suma Robocizny (Netto):</span><b>${totals.laborNet.toLocaleString()} zł</b></div>
          <div class="summary-row"><span>Suma Materiałów (Netto):</span><b>${totals.materialsNet.toLocaleString()} zł</b></div>
          <div class="summary-row" style="margin-top:2mm; padding-top:2mm; border-top:1px dashed #cbd5e1;"><span>Łącznie Netto:</span><b>${totals.totalNet.toLocaleString()} zł</b></div>
          <div class="summary-row"><span>VAT (${quote.items[0]?.vatRate || 8}%):</span><b>${totals.totalVat.toLocaleString()} zł</b></div>
          <div class="total-row">
            <span class="label label-theme" style="font-size: 10px;">Do zapłaty (Brutto):</span>
            <span class="total-val">${(totals.totalNet + totals.totalVat).toLocaleString()} zł</span>
          </div>
        </div>

        <div style="margin-top: 30mm; display: grid; grid-template-columns: 1fr 1fr; gap: 40mm; text-align: center;">
          <div style="border-top: 1px solid #e2e8f0; padding-top: 3mm;" class="label">Podpis wykonawcy</div>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 3mm;" class="label">Podpis zleceniodawcy</div>
        </div>
      </div>
    `;
  }
}

/**
 * Klasa sterująca generowaniem pliku
 */
export class PdfGenerator {
  static async download(quote: Quote, user: User | null): Promise<void> {
    if (typeof html2pdf === 'undefined') throw new Error('html2pdf not loaded');

    const themeColor = user?.pdfThemeColor || '#2563eb';
    
    // Tworzymy kontener, który MUSI być w DOM, ale może być ukryty
    const element = document.createElement('div');
    element.id = 'pdf-render-target';
    element.style.position = 'fixed';
    element.style.top = '0';
    element.style.left = '-10000px';
    element.style.width = '794px'; // Szerokość A4 w px (96 DPI)
    element.innerHTML = PdfTemplate.build(quote, user, themeColor);
    document.body.appendChild(element);

    try {
      const opt = {
        margin: 0,
        filename: `Wycena_${quote.number.replace(/\//g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true,
          width: 794
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } finally {
      document.body.removeChild(element);
    }
  }
}
