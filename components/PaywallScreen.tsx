import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { presentPaywall } from '../utils/paywall';

type Props = {
  onSuccess: () => void;
};

const PaywallScreen = ({ onSuccess }: Props) => {

  useEffect(() => {
    let mounted = true;

    (async () => {
      const success = await presentPaywall();
      if (success && mounted) {
        onSuccess();
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={styles.text}>Sprawdzanie subskrypcji…</Text>
    </View>
  );
};

export default PaywallScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617'
  },
  text: {
    marginTop: 15,
    color: '#94a3b8'
  }
});
