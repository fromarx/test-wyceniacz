import React, { useState } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, 
  ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAppContext } from '../store/AppContext';
import { 
  ArrowLeft, CheckCircle, Clock, Edit3, ExternalLink, 
  Package, Receipt, User, MapPin, Check 
} from 'lucide-react-native';
import { QuoteStatus } from '../types';
import { FinanceUtils } from '../utils/FinanceUtils';
import { PdfGenerator } from '../utils/PdfServiceMobile';

const QuoteDetails: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: { id: string } }, 'params'>>();
  const { id } = route.params;
  const { state, updateQuote } = useAppContext();
  const { darkMode, user } = state;
  const [isGenerating, setIsGenerating] = useState(false);
  
  const quote = state.quotes.find(q => q.id === id);
  if (!quote) return null;

  // ZABEZPIECZENIE PRZED BŁĘDEM items.reduce
  const safeItems = Array.isArray(quote.items) ? quote.items : [];
  const totals = FinanceUtils.getQuoteTotals(safeItems);

  const handleDownloadPdf = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    
    try {
      await PdfGenerator.generateAndShare(quote, user);
      
      if (quote.status === QuoteStatus.DRAFT) {
        updateQuote({ ...quote, status: QuoteStatus.SENT });
      }
    } catch (error) {
      console.error("PDF Error:", error);
      Alert.alert("Błąd", "Nie udało się wygenerować PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStatusChange = (newStatus: QuoteStatus) => {
    updateQuote({ ...quote, status: newStatus });
  };

  const isAccepted = quote.status === QuoteStatus.ACCEPTED;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? '#020617' : '#f8fafc' }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header Actions */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={16} color={darkMode ? '#64748b' : '#475569'} />
            <Text style={[styles.backText, { color: darkMode ? '#64748b' : '#475569' }]}>WSTECZ</Text>
          </TouchableOpacity>
          <View style={styles.actionGroup}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('NewQuote', { id: quote.id })}
              style={[styles.editBtn, { backgroundColor: darkMode ? '#0f172a' : '#fff', borderColor: darkMode ? '#1e293b' : '#cbd5e1' }]}
            >
              <Edit3 size={14} color="#3b82f6" />
              <Text style={styles.editBtnText}>EDYTUJ</Text>
            </TouchableOpacity>
            <View style={[styles.statusBadge, { backgroundColor: isAccepted ? '#16a34a' : '#dbeafe' }]}>
              {isAccepted ? <CheckCircle size={10} color="#fff" /> : <Clock size={10} color="#1d4ed8" />}
              <Text style={[styles.statusText, { color: isAccepted ? '#fff' : '#1d4ed8' }]}>{quote.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {!isAccepted && (
          <TouchableOpacity 
            onPress={() => handleStatusChange(QuoteStatus.ACCEPTED)}
            style={styles.acceptBigBtn}
          >
            <Check size={20} color="#fff" strokeWidth={3} />
            <Text style={styles.acceptBigBtnText}>ZATWIERDŹ: ZAAKCEPTOWANA</Text>
          </TouchableOpacity>
        )}

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: darkMode ? '#0f172a' : '#fff', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }]}>
          <View style={styles.infoTop}>
            <View>
              <Text style={styles.label}>DOKUMENT NR</Text>
              <Text style={[styles.title, { color: darkMode ? '#f1f5f9' : '#0f172a' }]}>{quote.number}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.label}>DATA</Text>
              <Text style={[styles.dateText, { color: darkMode ? '#94a3b8' : '#475569' }]}>{quote.date}</Text>
            </View>
          </View>
          
          <View style={[styles.divider, { borderBottomColor: darkMode ? '#1e293b' : '#f1f5f9' }]} />
          
          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <View style={styles.iconLabel}><User size={10} color="#3b82f6" /><Text style={styles.label}>KLIENT</Text></View>
              <Text style={[styles.value, { color: darkMode ? '#f1f5f9' : '#0f172a' }]}>{quote.clientFirstName} {quote.clientLastName}</Text>
            </View>
            <View style={styles.gridCol}>
              <View style={styles.iconLabel}><MapPin size={10} color="#3b82f6" /><Text style={styles.label}>MIEJSCE</Text></View>
              <Text style={[styles.value, { color: darkMode ? '#f1f5f9' : '#0f172a' }]}>{quote.serviceCity}</Text>
            </View>
          </View>
        </View>

        {/* Summary Card (Black) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryStats}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>KOSZT ROBOCIZNY</Text>
              <Text style={styles.statValue}>{totals.laborNet.toLocaleString()} zł</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>KOSZT MATERIAŁÓW</Text>
              <Text style={styles.statValue}>{totals.materialsNet.toLocaleString()} zł</Text>
            </View>
            <View style={[styles.statRow, styles.statBorder]}>
              <Text style={styles.statLabelPrimary}>ŁĄCZNIE NETTO</Text>
              <Text style={styles.statValuePrimary}>{totals.totalNet.toLocaleString()} zł</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>VAT ({safeItems[0]?.vatRate || 8}%)</Text>
              <Text style={styles.statValue}>{totals.totalVat.toLocaleString()} zł</Text>
            </View>
          </View>
          
          <View style={styles.totalSection}>
            <View>
              <Text style={styles.totalLabel}>SUMA DO ZAPŁATY:</Text>
              <Text style={styles.totalValue}>{(totals.totalNet + totals.totalVat).toLocaleString()} zł</Text>
            </View>
            <Receipt size={40} color="rgba(255,255,255,0.05)" style={styles.receiptIcon} />
          </View>
        </View>

        {/* Scope of works */}
        <Text style={[styles.sectionHeader, { color: darkMode ? '#475569' : '#1e293b' }]}>ZAKRES PRAC</Text>
        <View style={styles.itemsList}>
          {safeItems.map((item, idx) => (
            <View key={idx} style={[styles.itemCard, { backgroundColor: darkMode ? '#0f172a' : '#fff', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }]}>
              <View style={styles.itemHeader}>
                <View style={styles.itemIndex}><Text style={styles.itemIndexText}>{idx + 1}</Text></View>
                <Text style={[styles.itemName, { color: darkMode ? '#f1f5f9' : '#0f172a' }]}>{item.name.toUpperCase()}</Text>
                <Text style={styles.itemPriceTotal}>{(FinanceUtils.calculateItemLabor(item) + FinanceUtils.calculateItemMaterials(item)).toLocaleString()} zł</Text>
              </View>
              
              <View style={[styles.itemDetailRow, { backgroundColor: darkMode ? '#020617' : '#f8fafc' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemDetailLabel}>ROBOCIZNA</Text>
                  <Text style={[styles.itemDetailValue, { color: darkMode ? '#f1f5f9' : '#0f172a' }]}>{item.netPrice} zł / {item.unit}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemDetailLabel}>ILOŚĆ</Text>
                  <Text style={[styles.itemDetailValue, { color: darkMode ? '#f1f5f9' : '#0f172a' }]}>{item.quantity} {item.unit}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* PDF Button */}
        <TouchableOpacity 
          onPress={handleDownloadPdf}
          disabled={isGenerating}
          style={[styles.pdfBtn, isGenerating && styles.pdfBtnDisabled]}
        >
          {isGenerating ? <ActivityIndicator color="#fff" /> : <ExternalLink size={20} color="#fff" />}
          <Text style={styles.pdfBtnText}>
            {isGenerating ? 'PRZYGOTOWUJĘ PDF...' : 'UDOSTĘPNIJ PDF'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  backText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  actionGroup: { flexDirection: 'row', gap: 8 },
  editBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, gap: 6 },
  editBtnText: { fontSize: 10, fontWeight: '900', color: '#3b82f6' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 6 },
  statusText: { fontSize: 9, fontWeight: '900' },
  acceptBigBtn: { backgroundColor: '#16a34a', padding: 18, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 20, borderBottomWidth: 4, borderBottomColor: '#166534' },
  acceptBigBtnText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  infoCard: { padding: 24, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
  infoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: 8, fontWeight: '900', color: '#64748b', letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  dateText: { fontSize: 12, fontWeight: '900' },
  divider: { borderBottomWidth: 1, borderStyle: 'dashed', marginVertical: 16 },
  gridRow: { flexDirection: 'row' },
  gridCol: { flex: 1 },
  iconLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  value: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  summaryCard: { backgroundColor: '#020617', padding: 28, borderRadius: 40, marginBottom: 24, borderBottomWidth: 8, borderBottomColor: '#1e3a8a' },
  summaryStats: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', pb: 16, marginBottom: 16 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '900', letterSpacing: 1 },
  statValue: { fontSize: 10, color: '#fff', fontWeight: '900' },
  statBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 8, marginTop: 4 },
  statLabelPrimary: { fontSize: 10, color: '#3b82f6', fontWeight: '900', letterSpacing: 1 },
  statValuePrimary: { fontSize: 11, color: '#fff', fontWeight: '900' },
  totalSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  totalLabel: { fontSize: 9, color: '#3b82f6', fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  totalValue: { fontSize: 36, color: '#fff', fontWeight: '900', letterSpacing: -2 },
  receiptIcon: { position: 'absolute', right: -10, bottom: -10 },
  sectionHeader: { fontSize: 10, fontWeight: '900', letterSpacing: 3, paddingLeft: 8, marginBottom: 16 },
  itemsList: { gap: 12 },
  itemCard: { padding: 20, borderRadius: 32, borderWidth: 2 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  itemIndex: { backgroundColor: '#2563eb', width: 28, height: 28, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  itemIndexText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  itemName: { flex: 1, fontSize: 11, fontWeight: '900' },
  itemPriceTotal: { fontSize: 12, fontWeight: '900', color: '#2563eb', fontStyle: 'italic' },
  itemDetailRow: { flexDirection: 'row', padding: 12, borderRadius: 16, gap: 10 },
  itemDetailLabel: { fontSize: 7, fontWeight: '900', color: '#64748b', marginBottom: 2 },
  itemDetailValue: { fontSize: 9, fontWeight: '900' },
  pdfBtn: { backgroundColor: '#2563eb', padding: 20, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 30, borderBottomWidth: 5, borderBottomColor: '#1e3a8a' },
  pdfBtnDisabled: { backgroundColor: '#475569', borderBottomColor: '#1e293b' },
  pdfBtnText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 2 }
});

export default QuoteDetails;