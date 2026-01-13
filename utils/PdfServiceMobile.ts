import { Quote, User } from '../types';
import { PdfTemplate } from './PDFTemplate';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';

export class PdfGenerator {
  static async generateAndShare(quote: Quote, user: User | null): Promise<void> {
    try {
      const html = PdfTemplate.build(quote, user);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      const isMailAvailable = await MailComposer.isAvailableAsync();

      if (isMailAvailable && quote.clientEmail) {
        // Jeśli mamy maila klienta, otwórz okno maila z załącznikiem i tytułem
        await MailComposer.composeAsync({
          recipients: [quote.clientEmail],
          subject: `Wycena nr ${quote.number} - ${quote.clientFirstName} ${quote.clientLastName}`,
          body: `Dzień dobry,\n\nw załączeniu przesyłam przygotowaną wycenę prac.\n\nZ poważaniem,\n${user?.firstName} ${user?.lastName}\n${user?.companyName}`,
          attachments: [uri],
        });
      } else {
        // Fallback do ogólnego udostępniania
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error('Błąd PDF/Mail:', error);
      throw error;
    }
  }

  static async download(quote: Quote, user: User | null): Promise<void> {
    await this.generateAndShare(quote, user);
  }
}