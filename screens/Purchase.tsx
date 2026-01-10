import React, { useState } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, 
  ActivityIndicator, SafeAreaView
} from 'react-native';
import { useAppContext } from '../store/AppContext';
import { Shield, Sparkles, History, Terminal } from 'lucide-react-native';
import { presentPaywall } from '../store/Paywall';

const Purchase: React.FC = () => {
  const { state, retrySubscriptionCheck } = useAppContext();
  const { darkMode, user } = state;
  const [loading, setLoading] = useState(false);

  const handleOpenPaywall = async () => {
    setLoading(true);
    try {
      const result = await presentPaywall();
      if (result) {
        await retrySubscriptionCheck();
      }
    } catch (err) {
      console.error("Paywall error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: darkMode ? '#020617' : '#f8fafc' }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: darkMode ? '#1e293b' : '#f1f5f9' }]}>
            <Shield size={12} color="#2563eb" />
            <Text style={styles.badgeText}>DOSTĘP PREMIUM</Text>
          </View>
          <Text style={[styles.title, { color: darkMode ? '#fff' : '#0f172a' }]}>
            Odblokuj pełne możliwości
          </Text>
          <Text style={styles.description}>
            Twoja licencja jest powiązana z unikalnym ID urządzenia:
          </Text>
          <View style={[styles.idBox, { backgroundColor: darkMode ? '#0f172a' : '#fff' }]}>
            <Text style={styles.idText}>{user?.id || 'ID_NOT_FOUND'}</Text>
          </View>
        </View>

        <View style={styles.ctaSection}>
          <TouchableOpacity
            onPress={handleOpenPaywall}
            disabled={loading}
            style={styles.mainBtn}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Sparkles size={20} color="#fff" />
                <Text style={styles.mainBtnText}>ZOBACZ OFERTĘ</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleOpenPaywall} // RevenueCatUI obsługuje Restore wewnątrz Paywalla
            style={styles.restoreBtn}
          >
            <History size={16} color="#64748b" />
            <Text style={styles.restoreBtnText}>PRZYWRÓĆ ZAKUPY</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Subskrypcja zostanie przypisana do Twojego konta w sklepie.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 32, flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6, marginBottom: 16 },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#2563eb', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 12 },
  description: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  idBox: { marginTop: 20, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b' },
  idText: { fontSize: 10, color: '#64748b', opacity: 0.7 },
  ctaSection: { gap: 16, width: '100%' },
  mainBtn: {
    backgroundColor: '#2563eb',
    height: 64,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5
  },
  mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  restoreBtn: { height: 50, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  restoreBtnText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  footer: { marginTop: 40 },
  footerText: { fontSize: 10, color: '#64748b', textAlign: 'center', opacity: 0.6 }
});

export default Purchase;