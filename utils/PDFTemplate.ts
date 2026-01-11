import { Quote, User, QuoteItem } from '../types';

export class PdfTemplate {
  private static getStyles(color: string) {
    return `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        .pdf-container { width: 210mm; padding: 15mm; box-sizing: border-box; background: #fff; color: #1e293b; font-family: 'Inter', sans-serif; font-size: 10px; line-height: 1.4; }
        .header { display: flex; justify-content: space-between; border-bottom: 3px solid ${color}; padding-bottom: 5mm; margin-bottom: 8mm; }
        .logo-box { height: 15mm; width: 15mm; background: ${color}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; border-radius: 6px; }
        .grid-data { display: grid; grid-template-columns: 1fr 1fr; gap: 20mm; margin: 5mm 0; }
        .label { font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.5px; }
        .label-theme { color: ${color}; }
        .table { width: 100%; border-collapse: collapse; margin: 5mm 0; }
        .table th { text-align: left; padding: 3mm 2mm; border-bottom: 2px solid #0f172a; font-size: 8px; text-transform: uppercase; color: #64748b; }
        .table td { padding: 3mm 2mm; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        .mat-row { font-size: 8.5px; color: #475569; padding-left: 4mm; font-style: italic; }
        .summary-wrapper { display: flex; justify-content: flex-end; margin-top: 10mm; }
        .summary-box { width: 90mm; background: #f8fafc; padding: 5mm; border-radius: 10px; border: 1px solid #e2e8f0; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 1.5mm; }
        .total-row { display: flex; justify-content: space-between; border-top: 2px solid #0f172a; margin-top: 3mm; padding-top: 3mm; align-items: center; }
        .total-val { font-size: 20px; font-weight: 900; color: #0f172a; }
        .badge { display: inline-block; padding: 2px 5px; border-radius: 4px; font-size: 7px; font-weight: 900; background: #e2e8f0; color: #475569; text-transform: uppercase; margin-left: 5px; }
      </style>
    `;
  }

  static build(quote: Quote, user: User | null): string {
    const color = user?.pdfThemeColor || '#2563eb';

    const itemsHtml = quote.items.map((item, idx) => {
      // Obliczenia robocizny
      const laborTotal = item.netPrice * item.quantity;

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
            <div style="font-weight: 800; font-size: 11px;">${item.name}</div>
            ${materialsHtml}
          </td>
          <td style="text-align: center;">${item.unit}</td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">${item.netPrice.toLocaleString()} zł</td>
          <td style="text-align: right; font-weight: 800;">${(laborTotal + materialsTotal).toLocaleString()} zł</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="pdf-container">
        ${this.getStyles(color)}
        <div class="header">
          <div style="display: flex; gap: 10px; align-items: center;">
            ${user?.logo ? `<img src="${user.logo}" style="height: 15mm;" />` : `<div class="logo-box">${user?.companyName?.charAt(0) || 'Q'}</div>`}
            <div>
              <h2 style="margin:0; font-size:16px; text-transform: uppercase;">${user?.companyName || 'Wykonawca'}</h2>
              <div class="label label-theme">Profesjonalny Kosztorys Prac</div>
            </div>
          </div>
          <div style="text-align: right;">
            <h1 style="margin:0; font-size: 20px; color: ${color};">${quote.number}</h1>
            <div style="font-size: 9px; font-weight: 700;">Data wystawienia: ${quote.date}</div>
          </div>
        </div>

        <div class="grid-data">
          <div>
            <div class="label label-theme">Wykonawca</div>
            <div style="font-weight:800; font-size: 11px;">${user?.firstName} ${user?.lastName}</div>
            <div>${user?.address}</div>
            <div>${user?.postalCode} ${user?.city}</div>
            ${user?.nip ? `<div style="margin-top:1mm;">NIP: <b>${user.nip}</b></div>` : ''}
            <div>Tel: ${user?.phone || '-'}</div>
          </div>
          <div style="text-align: right;">
            <div class="label">Zleceniodawca</div>
            <div style="font-weight:800; font-size: 11px;">${quote.clientFirstName} ${quote.clientLastName}</div>
            <div>${quote.serviceStreet} ${quote.serviceHouseNo}${quote.serviceApartmentNo ? '/' + quote.serviceApartmentNo : ''}</div>
            <div>${quote.servicePostalCode} ${quote.serviceCity}</div>
            <div>Tel: ${quote.clientPhone}</div>
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
            <div class="summary-row"><span>Suma netto:</span><b>${quote.totalNet.toLocaleString()} zł</b></div>
            <div class="summary-row"><span>Podatek VAT (${quote.items[0]?.vatRate || 23}%):</span><b>${quote.totalVat.toLocaleString()} zł</b></div>
            <div class="total-row">
              <span class="label label-theme" style="font-size: 9px;">Suma Brutto (do zapłaty):</span>
              <span class="total-val">${quote.totalGross.toLocaleString()} zł</span>
            </div>
          </div>
        </div>

        <div style="margin-top: 25mm; display: flex; justify-content: space-between; text-align: center;">
          <div style="width: 60mm; border-top: 1px solid #cbd5e1; padding-top: 2mm;" class="label">Podpis Wykonawcy</div>
          <div style="width: 60mm; border-top: 1px solid #cbd5e1; padding-top: 2mm;" class="label">Podpis Zleceniodawcy</div>
        </div>
      </div>
    `;
  }
}