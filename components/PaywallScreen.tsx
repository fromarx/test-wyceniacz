import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';

// ❌ USUNĘLIŚMY IMPORT 'presentPaywall'. TERAZ JEST CZYSTO.

type Props = {
  onSuccess: () => void;
};

const PaywallScreen = ({ onSuccess }: Props) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Symulujemy chwilę "myślenia", żeby nie mignęło za szybko
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleSkip = () => {
    // Od razu wpuszczamy do aplikacji
    onSuccess();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.text}>Ładowanie systemu...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={{ fontSize: 50, marginBottom: 20 }}>🛠️</Text>
        <Text style={styles.title}>Tryb Deweloperski</Text>
        <Text style={styles.message}>
          Moduł płatności został tymczasowo odłączony, aby umożliwić testowanie bez konfiguracji Google Play.
        </Text>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSkip}
        >
          <Text style={styles.buttonText}>Wejdź do aplikacji</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    width: '100%',
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
    marginBottom: 30,
    lineHeight: 24
  },
  button: {
    backgroundColor: '#2563eb',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  }
});
