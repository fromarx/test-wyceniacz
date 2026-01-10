import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../store/AppContext';
import { Search, ChevronRight, Edit3 } from 'lucide-react-native';
import { QuoteStatus } from '../types';

// Definicja typów dla nawigacji (opcjonalna, ale dobra praktyka)
type RootStackParamList = {
  QuoteDetails: { id: string };
  NewQuote: { id: string };
  Dashboard: undefined;
};

const QuoteList: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state } = useAppContext();
  const { darkMode } = state;
  const [activeTab, setActiveTab] = useState<QuoteStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const tabs = [
    { id: 'all', label: 'Wszystkie' },
    { id: QuoteStatus.DRAFT, label: 'Robocze' },
    { id: QuoteStatus.SENT, label: 'Wysłane' },
    { id: QuoteStatus.ACCEPTED, label: 'Zaakcept.' },
  ];

  const filteredQuotes = state.quotes.filter(q => {
    const matchesTab = activeTab === 'all' || q.status === activeTab;
    const clientFullName = `${q.clientFirstName} ${q.clientLastName}`.toLowerCase();
    const matchesSearch = clientFullName.includes(searchTerm.toLowerCase()) || 
                          q.number.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getStatusStyle = (status: QuoteStatus) => {
    switch (status) {
      case QuoteStatus.ACCEPTED: return { bg: darkMode ? '#064e3b' : '#dcfce7', text: darkMode ? '#4ade80' : '#15803d' };
      case QuoteStatus.SENT: return { bg: darkMode ? '#1e3a8a' : '#dbeafe', text: darkMode ? '#60a5fa' : '#1d4ed8' };
      case QuoteStatus.REJECTED: return { bg: darkMode ? '#7f1d1d' : '#fee2e2', text: darkMode ? '#f87171' : '#b91c1c' };
      default: return { bg: darkMode ? '#1e293b' : '#f1f5f9', text: darkMode ? '#94a3b8' : '#475569' };
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: darkMode ? '#020617' : '#f8fafc' }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search 
          size={18} 
          color={darkMode ? '#475569' : '#94a3b8'} 
          style={styles.searchIcon} 
        />
        <TextInput
          placeholder="Szukaj klientów lub numerów..."
          placeholderTextColor={darkMode ? '#334155' : '#94a3b8'}
          style={[
            styles.searchInput,
            { 
              backgroundColor: darkMode ? '#0f172a' : '#ffffff',
              borderColor: darkMode ? '#1e293b' : '#e2e8f0',
              color: darkMode ? '#f1f5f9' : '#1e293b'
            }
          ]}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
        <View style={styles.tabsContainer}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id as any)}
                style={[
                  styles.tabButton,
                  isActive ? styles.tabActive : { backgroundColor: darkMode ? '#0f172a' : '#ffffff', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }
                ]}
              >
                <Text style={[styles.tabLabel, isActive ? { color: '#ffffff' } : { color: '#64748b' }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Quotes List */}
      <View style={styles.listContainer}>
        {filteredQuotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ color: darkMode ? '#475569' : '#94a3b8', fontStyle: 'italic' }}>
              Brak wycen spełniających kryteria
            </Text>
          </View>
        ) : (
          filteredQuotes.map(quote => {
            const statusStyle = getStatusStyle(quote.status);
            return (
              <TouchableOpacity 
                key={quote.id}
                onPress={() => navigation.navigate('QuoteDetails', { id: quote.id })}
                style={[
                  styles.quoteCard,
                  { backgroundColor: darkMode ? '#0f172a' : '#ffffff', borderColor: darkMode ? '#1e293b' : '#f1f5f9' }
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.quoteNumber, { color: darkMode ? '#475569' : '#94a3b8' }]}>{quote.number}</Text>
                    <Text style={[styles.clientName, { color: darkMode ? '#f1f5f9' : '#1e293b' }]} numberOfLines={1}>
                      {quote.clientFirstName} {quote.clientLastName}
                    </Text>
                  </View>
                  
                  <View style={styles.headerActions}>
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('NewQuote', { id: quote.id })}
                      style={[styles.editButton, { backgroundColor: darkMode ? '#1e293b' : '#eff6ff' }]}
                    >
                      <Edit3 size={14} color="#2563eb" />
                    </TouchableOpacity>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>{quote.status}</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.dateText}>{quote.date}</Text>
                    <Text style={styles.itemsCount}>{quote.items.length} usług(i)</Text>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={[styles.totalPrice, { color: darkMode ? '#f1f5f9' : '#1e293b' }]}>
                      {quote.totalGross.toLocaleString()} zł
                    </Text>
                    <View style={styles.detailsLink}>
                      <Text style={styles.detailsText}>Szczegóły</Text>
                      <ChevronRight size={14} color="#2563eb" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { padding: 16, position: 'relative' },
  searchIcon: { position: 'absolute', left: 28, top: 32, zIndex: 1 },
  searchInput: {
    height: 48,
    paddingLeft: 44,
    paddingRight: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  tabsScroll: { paddingLeft: 16, marginBottom: 16 },
  tabsContainer: { flexDirection: 'row', paddingRight: 32 },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  tabActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  tabLabel: { fontSize: 12, fontWeight: '700' },
  listContainer: { paddingHorizontal: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  quoteCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  quoteNumber: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  clientName: { fontSize: 16, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  editButton: { padding: 8, borderRadius: 8, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '900' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 },
  dateText: { fontSize: 12, color: '#64748b' },
  itemsCount: { fontSize: 12, color: '#64748b' },
  priceContainer: { alignItems: 'flex-end' },
  totalPrice: { fontSize: 18, fontWeight: '900' },
  detailsLink: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  detailsText: { color: '#2563eb', fontWeight: 'bold', fontSize: 12, marginRight: 2 }
});

export default QuoteList;