
import { QuoteItem } from '../types';

export class FinanceUtils {
  static calculateItemLabor(item: QuoteItem): number {
    return item.netPrice * item.quantity;
  }

  static calculateItemMaterials(item: QuoteItem): number {
    if (item.materialMode === 'estimated') {
      return (item.estimatedMaterialPrice || 0) * item.quantity;
    }
    return (item.materials || []).reduce((acc, m) => acc + (m.price * (m.consumption || 1) * item.quantity), 0);
  }

  static getQuoteTotals(items: QuoteItem[]) {
    return items.reduce((acc, item) => {
      const labor = this.calculateItemLabor(item);
      const materials = this.calculateItemMaterials(item);
      const itemNet = labor + materials;
      
      acc.laborNet += labor;
      acc.materialsNet += materials;
      acc.totalNet += itemNet;
      acc.totalVat += itemNet * (item.vatRate / 100);
      return acc;
    }, { laborNet: 0, materialsNet: 0, totalNet: 0, totalVat: 0 });
  }
}
