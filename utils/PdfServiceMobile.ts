import { Quote, User } from '../types';
import { PdfTemplate } from './PDFTemplate';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export class PdfGenerator {
  static async generateAndShare(quote: Quote, user: User | null): Promise<void> {
    try {
      // 1. Generuj HTML
      const html = PdfTemplate.build(quote, user);
      
      // 2. Generuj plik PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      console.log('PDF wygenerowany:', uri);

      // 3. Sprawdź czy można udostępnić
      const canShare = await Sharing.isAvailableAsync();
      
      if (canShare) {
        // Używamy natywnego menu udostępniania
        // To powinno pokazać Gmaila, WhatsApp, Dysk itp.
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf', // Ważne dla Androida
          UTI: 'com.adobe.pdf',       // Ważne dla iOS
          dialogTitle: `Wycena ${quote.number}`
        });
      } else {
        Alert.alert("Błąd", "Twoje urządzenie nie wspiera udostępniania plików.");
      }

    } catch (error) {
      console.error('Błąd PDF:', error);
      Alert.alert('Błąd', 'Nie udało się wygenerować pliku PDF.');
    }
  }

  static async download(quote: Quote, user: User | null): Promise<void> {
    await this.generateAndShare(quote, user);
  }
}