import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { presentPaywall } from '../utils/paywall';

type Props = {
  onSuccess: () => void;
};

const PaywallScreen = ({ onSuccess }: Props) => {
  const [isLoading, setIsLoading] = useState(true);
  const [paywallFailed, setPaywallFailed] = useState(false);

useEffect(() => {
    let mounted = true;

    // 👇 ZMIANA: Wywalamy próbę połączenia, od razu pokazujemy przycisk "Skip"
    (async () => {
      // Symulujemy małe opóźnienie (opcjonalne)
      // await new Promise(resolve => setTimeout(resolve, 500));
      
      if (mounted) {
        console.log("Paywall bypass: Wymuszamy tryb awaryjny");
        setPaywallFailed(true); // <--- To pokaże przycisk "Kontynuuj w trybie deweloperskim"
        setIsLoading(false);    // <--- To schowa kółko ładowania
      }
    })();

    /* 
    ❌ STARY KOD (ZAKOMENTOWANY), KTÓRY WYWALAŁ APKĘ:
    (async () => {
      try {
        setIsLoading(true);
        const success = await presentPaywall(); // <--- TO ZABIJAŁO APKĘ
        if (success && mounted) {
          onSuccess();
        } else if (mounted) {
          setPaywallFailed(true);
          setIsLoading(false);
        }
      } catch (error) { ... }
    })();
    */

    return () => {
      mounted = false;
    };
  }, []);

  const handleSkip = () => {
    Alert.alert(
      'Tryb deweloperski',
      'Pomijasz paywall. W produkcji wymagana będzie aktywna subskrypcja.',
      [
        { text: 'Anuluj', style: 'cancel' },
        { 
          text: 'Kontynuuj', 
          onPress: () => onSuccess(),
          style: 'default'
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.text}>Sprawdzanie subskrypcji…</Text>
      </View>
    );
  }

  // Fallback gdy paywall nie działa (np. Expo Go)
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Wymagana subskrypcja</Text>
        <Text style={styles.message}>
          Aby korzystać z aplikacji, potrzebujesz aktywnej subskrypcji.
        </Text>
        <Text style={styles.devNote}>
          (W trybie deweloperskim możesz pominąć ten ekran)
        </Text>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSkip}
        >
          <Text style={styles.buttonText}>Kontynuuj w trybie deweloperskim</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PaywallScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
    padding: 20
  },
  content: {
    alignItems: 'center',
    maxWidth: 400
  },
  text: {
    marginTop: 15,
    color: '#94a3b8',
    fontSize: 14
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f1f5f9',
    marginBottom: 16,
    textAlign: 'center'
  },
  message: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 8
  },
  devNote: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 24
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  }
});
