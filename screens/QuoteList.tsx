import React, { useState, useEffect } from 'react';
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
import { getThemeColors, getShadows } from '../utils/theme';

type RootStackParamList = {
  QuoteDetails: { id: string };
  NewQuote: { id: string };
  Dashboard: undefined;
};

const QuoteList: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, setActiveScreen } = useAppContext();
  const { darkMode, quotes } = state;
  const colors = getThemeColors(darkMode);
  const shadows = getShadows(darkMode);
  const styles = getStyles(colors);
  
  const [activeTab, setActiveTab] = useState<QuoteStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setActiveScreen('Wyceny'); 
  }, []);

  const tabs = [
    { id: 'all', label: 'Wszystkie' },
    { id: QuoteStatus.DRAFT, label: 'Robocze' },
    { id: QuoteStatus.SENT, label: 'Wysłane' },
    { id: QuoteStatus.ACCEPTED, label: 'Zatwierdzone' },
  ];

  const filteredQuotes = quotes.filter(q => {
    const matchesTab = activeTab === 'all' || q.status === activeTab;
    const clientFullName = `${q.clientFirstName} ${q.clientLastName}`.toLowerCase();
    const matchesSearch = clientFullName.includes(searchTerm.toLowerCase()) || 
                          q.number.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getStatusStyle = (status: QuoteStatus) => {
    switch (status) {
      case QuoteStatus.ACCEPTED: return { bg: colors.successBg, text: colors.success };
      case QuoteStatus.SENT: return { bg: colors.accentLight, text: colors.accent };
      case QuoteStatus.REJECTED: return { bg: colors.dangerBg, text: colors.danger };
      default: return { bg: colors.surfaceSubtle, text: colors.textMuted };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={{ position: 'relative' }}>
          <Search 
            size={18} 
            color={colors.textMuted} 
            style={styles.searchIcon} 
          />
          <TextInput
            placeholder="Szukaj klientów lub numerów..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.searchInput,
              { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text
              }
            ]}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
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
                    isActive 
                      ? { backgroundColor: colors.accent, borderColor: colors.accent } 
                      : { backgroundColor: colors.surface, borderColor: colors.border }
                  ]}
                >
                  <Text style={[styles.tabLabel, { color: isActive ? '#ffffff' : colors.textSecondary }]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Quotes List */}
      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {filteredQuotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>
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
                  { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.quoteNumber, { color: colors.textSecondary }]}>{quote.number}</Text>
                    <Text style={[styles.clientName, { color: colors.text }]} numberOfLines={1}>
                      {quote.clientFirstName} {quote.clientLastName}
                    </Text>
                  </View>
                  
                  <View style={styles.headerActions}>
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('NewQuote', { id: quote.id })}
                      style={[styles.editButton, { backgroundColor: colors.surfaceSubtle }]}
                    >
                      <Edit3 size={14} color={colors.accent} />
                    </TouchableOpacity>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>{quote.status}</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={[styles.dateText, { color: colors.textMuted }]}>{quote.date}</Text>
                    <Text style={[styles.itemsCount, { color: colors.textMuted }]}>{quote.items.length} usług(i)</Text>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={[styles.totalPrice, { color: colors.text }]}>
                      {quote.totalGross.toLocaleString()} zł
                    </Text>
                    <View style={styles.detailsLink}>
                      <Text style={[styles.detailsText, { color: colors.accent }]}>Szczegóły</Text>
                      <ChevronRight size={14} color={colors.accent} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { padding: 16, paddingBottom: 8 },
  searchIcon: { position: 'absolute', left: 16, top: 15, zIndex: 1 },
  searchInput: {
    height: 48,
    paddingLeft: 44,
    paddingRight: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  tabsWrapper: { marginBottom: 8 },
  tabsScroll: { paddingLeft: 16 },
  tabsContainer: { flexDirection: 'row', paddingRight: 32 },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  tabLabel: { fontSize: 12, fontWeight: '700' },
  listContainer: { padding: 16, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  quoteCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  quoteNumber: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  clientName: { fontSize: 16, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  editButton: { padding: 8, borderRadius: 10, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 },
  dateText: { fontSize: 12, fontWeight: '600' },
  itemsCount: { fontSize: 12 },
  priceContainer: { alignItems: 'flex-end' },
  totalPrice: { fontSize: 18, fontWeight: '900' },
  detailsLink: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  detailsText: { fontWeight: 'bold', fontSize: 12, marginRight: 2 }
});

export default QuoteList;
