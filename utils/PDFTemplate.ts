import { Quote, User, QuoteItem } from '../types';

export class PdfTemplate {
  private static getStyles(color: string) {
    return `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 10px; line-height: 1.4; color: #1e293b; }
        .pdf-container { width: 210mm; padding: 15mm; background: #fff; }
        .header { border-bottom: 3px solid ${color}; padding-bottom: 5mm; margin-bottom: 8mm; overflow: hidden; }
        .header-left { float: left; }
        .header-right { float: right; text-align: right; }
        .logo-box { width: 15mm; height: 15mm; background: ${color}; color: #fff; text-align: center; line-height: 15mm; font-size: 20px; font-weight: 900; border-radius: 6px; float: left; margin-right: 10px; }
        .logo-img { height: 15mm; float: left; margin-right: 10px; }
        .company-info { float: left; }
        .grid-data { overflow: hidden; margin: 5mm 0; }
        .grid-left { float: left; width: 48%; }
        .grid-right { float: right; width: 48%; text-align: right; }
        .label { font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.5px; }
        .label-theme { color: ${color}; }
        .table { width: 100%; border-collapse: collapse; margin: 5mm 0; }
        .table th { text-align: left; padding: 3mm 2mm; border-bottom: 2px solid #0f172a; font-size: 8px; text-transform: uppercase; color: #64748b; }
        .table td { padding: 3mm 2mm; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        .mat-row { font-size: 8.5px; color: #475569; padding-left: 4mm; font-style: italic; margin-top: 2px; }
        .summary-wrapper { text-align: right; margin-top: 10mm; }
        .summary-box { display: inline-block; width: 90mm; background: #f8fafc; padding: 5mm; border-radius: 10px; border: 1px solid #e2e8f0; text-align: left; }
        .summary-row { overflow: hidden; margin-bottom: 1.5mm; }
        .summary-row span:first-child { float: left; }
        .summary-row b { float: right; }
        .total-row { border-top: 2px solid #0f172a; margin-top: 3mm; padding-top: 3mm; overflow: hidden; }
        .total-val { font-size: 20px; font-weight: 900; color: #0f172a; float: right; }
        .clearfix::after { content: ""; display: table; clear: both; }
      </style>
    `;
  }

  static build(quote: Quote, user: User | null): string {
    const color = user?.pdfThemeColor || '#2563eb';
    const items = quote.items || [];

    const itemsHtml = items.map((item, idx) => {
      // Obliczenia robocizny
      const laborTotal = (item.netPrice || 0) * (item.quantity || 0);

      // Obliczenia materiałów
      let materialsHtml = '';
      let materialsTotal = 0;

      if (item.materialMode === 'estimated') {
        materialsTotal = (item.estimatedMaterialPrice || 0) * item.quantity;
        materialsHtml = `<div class="mat-row">• Materiał (ryczałt): ${item.estimatedMaterialPrice} zł / ${item.unit}</div>`;
      } else if (item.materials && item.materials.length > 0) {
        materialsHtml = item.materials.map(m => {
          const mSubtotal = m.price * (m.consumption || 1) * item.quantity;
          materialsTotal += mSubtotal;
          return `<div class="mat-row">• ${m.name}: ${m.consumption} ${m.unit} x ${m.price} zł/j.m. = ${mSubtotal.toFixed(2)} zł</div>`;
        }).join('');
      }

      return `
        <tr>
          <td style="width: 5mm; color: #94a3b8;">${idx + 1}.</td>
          <td style="width: 90mm;">
            <div style="font-weight: 800; font-size: 11px;">${item.name || 'Usługa'}</div>
            ${materialsHtml}
          </td>
          <td style="text-align: center;">${item.unit || '-'}</td>
          <td style="text-align: center;">${item.quantity || 0}</td>
          <td style="text-align: right;">${(item.netPrice || 0).toLocaleString()} zł</td>
          <td style="text-align: right; font-weight: 800;">${(laborTotal + materialsTotal).toLocaleString()} zł</td>
        </tr>
      `;
    }).join('');

    const vatRate = items[0]?.vatRate || 23;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${this.getStyles(color)}
      </head>
      <body>
      <div class="pdf-container">
        <div class="header clearfix">
          <div class="header-left">
            ${user?.logo ? `<img src="${user.logo}" class="logo-img" />` : `<div class="logo-box">${user?.companyName?.charAt(0) || 'Q'}</div>`}
            <div class="company-info">
              <h2 style="margin:0; font-size:16px; text-transform: uppercase;">${user?.companyName || 'Wykonawca'}</h2>
              <div class="label label-theme">Profesjonalny Kosztorys Prac</div>
            </div>
          </div>
          <div class="header-right">
            <h1 style="margin:0; font-size: 20px; color: ${color};">${quote.number || 'WYC/2026/1'}</h1>
            <div style="font-size: 9px; font-weight: 700;">Data wystawienia: ${quote.date || new Date().toLocaleDateString('pl-PL')}</div>
          </div>
        </div>

        <div class="grid-data clearfix">
          <div class="grid-left">
            <div class="label label-theme">Wykonawca</div>
            <div style="font-weight:800; font-size: 11px;">${user?.firstName || ''} ${user?.lastName || ''}</div>
            <div>${user?.address || ''}</div>
            <div>${user?.postalCode || ''} ${user?.city || ''}</div>
            ${user?.nip ? `<div style="margin-top:1mm;">NIP: <b>${user.nip}</b></div>` : ''}
            <div>Tel: ${user?.phone || '-'}</div>
          </div>
          <div class="grid-right">
            <div class="label">Zleceniodawca</div>
            <div style="font-weight:800; font-size: 11px;">${quote.clientFirstName || ''} ${quote.clientLastName || ''}</div>
            <div>${quote.serviceStreet || ''} ${quote.serviceHouseNo || ''}${quote.serviceApartmentNo ? '/' + quote.serviceApartmentNo : ''}</div>
            <div>${quote.servicePostalCode || ''} ${quote.serviceCity || ''}</div>
            <div>Tel: ${quote.clientPhone || '-'}</div>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Lp.</th><th>Opis usługi i materiałów</th><th style="text-align:center;">J.M.</th><th style="text-align:center;">Ilość</th><th style="text-align:right;">Cena j.m.</th><th style="text-align:right;">Wartość</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div class="summary-wrapper">
          <div class="summary-box">
            <div class="summary-row"><span>Suma netto:</span><b>${(quote.totalNet || 0).toLocaleString()} zł</b></div>
            <div class="summary-row"><span>Podatek VAT (${vatRate}%):</span><b>${(quote.totalVat || 0).toLocaleString()} zł</b></div>
            <div class="total-row clearfix">
              <span class="label label-theme" style="font-size: 9px; float: left;">Suma Brutto (do zapłaty):</span>
              <span class="total-val">${(quote.totalGross || 0).toLocaleString()} zł</span>
            </div>
          </div>
        </div>

        <div style="margin-top: 25mm; overflow: hidden;">
          <div style="float: left; width: 60mm; border-top: 1px solid #cbd5e1; padding-top: 2mm; text-align: center;" class="label">Podpis Wykonawcy</div>
          <div style="float: right; width: 60mm; border-top: 1px solid #cbd5e1; padding-top: 2mm; text-align: center;" class="label">Podpis Zleceniodawcy</div>
        </div>
      </div>
      </body>
      </html>
    `;
  }
}