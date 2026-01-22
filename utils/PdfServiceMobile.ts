import { Quote, User } from '../types';
import { PdfTemplate } from './PDFTemplate';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
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

  // Zapisz PDF na urządzeniu (bez okna udostępniania)
  static async saveToDevice(quote: Quote, user: User | null): Promise<string | null> {
    try {
      // 1. Generuj HTML
      const html = PdfTemplate.build(quote, user);

      // 2. Generuj plik PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // 3. Przenieś do folderu dokumentów z czytelną nazwą
      const fileName = `Wycena_${quote.number?.replace(/\//g, '-') || 'brak'}_${Date.now()}.pdf`;
      const documentsDir = FileSystem.cacheDirectory;

      if (!documentsDir) {
        throw new Error('Brak dostępu do folderu dokumentów');
      }

      const newPath = `${documentsDir}${fileName}`;

      await FileSystem.moveAsync({
        from: uri,
        to: newPath,
      });

      console.log('PDF zapisany:', newPath);

      Alert.alert(
        'PDF zapisany ✓',
        `Plik "${fileName}" został zapisany w dokumentach aplikacji.`,
        [
          { text: 'OK' },
          {
            text: 'Otwórz',
            onPress: async () => {
              // Otwórz przez share żeby użytkownik mógł zobaczyć/wybrać gdzie zapisać
              const canShare = await Sharing.isAvailableAsync();
              if (canShare) {
                await Sharing.shareAsync(newPath, {
                  mimeType: 'application/pdf',
                  UTI: 'com.adobe.pdf',
                });
              }
            }
          }
        ]
      );

      return newPath;

    } catch (error) {
      console.error('Błąd zapisu PDF:', error);
      Alert.alert('Błąd', 'Nie udało się zapisać pliku PDF.');
      return null;
    }
  }

  static async download(quote: Quote, user: User | null): Promise<void> {
    await this.generateAndShare(quote, user);
  }
}