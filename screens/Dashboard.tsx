import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { useAppContext } from '../store/AppContext';
import { getThemeColors, getShadows, Typography, Spacing, BorderRadius } from '../utils/theme';
import { 
  FileText, 
  Users, 
  Plus, 
  Clock, 
  CheckCircle2, 
  ShoppingBag,
  ArrowRight,
  TrendingUp,
  LayoutGrid,
  ChevronRight,
  Briefcase
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

const Dashboard: React.FC<any> = ({ navigation }) => {
  const { state, setActiveScreen } = useAppContext();
  const { quotes, shoppingLists, darkMode, user } = state;
  const colors = getThemeColors(darkMode);
  const shadows = getShadows(darkMode);
  const styles = getStyles(colors);

  // Animation Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    setActiveScreen('Pulpit');
    
    // Entry Animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      })
    ]).start();
  }, []);

  const stats = useMemo(() => {
    const pendingQuotes = quotes.filter(q => q.status === 'wysłana' || q.status === 'robocza').length;
    const completedQuotes = quotes.filter(q => q.status === 'zaakceptowana').length;
    
    // Count incomplete shopping lists
    const activeShoppingLists = shoppingLists.filter(l => l.items?.some(i => !i.isBought)).length;
    
    return { pendingQuotes, completedQuotes, activeShoppingLists };
  }, [quotes, shoppingLists]);

  const recentQuotes = useMemo(() => {
    return quotes.slice(0, 5);
  }, [quotes]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          
          {/* SECTION: WELCOME & SUMMARY */}
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.md }]}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{stats.pendingQuotes}</Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>W toku</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.success }]}>{stats.completedQuotes}</Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Gotowe</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.warning }]}>{stats.activeShoppingLists}</Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Zakupy</Text>
              </View>
            </View>
          </View>

          {/* SECTION: ACTION DOCK */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Szybki start</Text>
          <View style={styles.actionDock}>
            <ActionCard 
              title="Nowa Wycena" 
              icon={<Plus size={24} color="#fff" />} 
              color={colors.accent} 
              onPress={() => navigation.navigate('NewQuote')}
              styles={styles}
            />
            <ActionCard 
              title="Klienci" 
              icon={<Users size={24} color={colors.accent} />} 
              color={colors.surface} 
              textColor={colors.text}
              iconColor={colors.accent}
              border={colors.border}
              onPress={() => navigation.navigate('ClientList')} 
              styles={styles}
            />
             <ActionCard 
              title="Usługi" 
              icon={<TrendingUp size={24} color={colors.success} />} 
              color={colors.surface} 
              textColor={colors.text}
              iconColor={colors.success}
              border={colors.border}
              onPress={() => navigation.navigate('Services')}
              styles={styles}
            />
          </View>

          {/* SECTION: ACTIVE TASKS */}
          {stats.activeShoppingLists > 0 && (
            <TouchableOpacity 
              style={[styles.alertCard, { backgroundColor: colors.warningBg, borderColor: colors.warning }]}
              onPress={() => navigation.navigate('ShoppingListScreen')}
            >
              <View style={styles.alertIcon}>
                <ShoppingBag size={20} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: colors.warning }]}>Masz otwarte listy zakupów</Text>
                <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>Kliknij, aby sprawdzić listę materiałów.</Text>
              </View>
              <ChevronRight size={20} color={colors.warning} />
            </TouchableOpacity>
          )}

          {/* SECTION: RECENT ACTIVITY */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Ostatnie wyceny</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Quotes')}>
              <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>ZOBACZ WSZYSTKIE</Text>
            </TouchableOpacity>
          </View>

          {recentQuotes.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <LayoutGrid size={48} color={colors.textMuted} style={{ opacity: 0.5 }} />
              <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Tu pojawią się Twoje wyceny</Text>
              <TouchableOpacity style={{ marginTop: 16 }} onPress={() => navigation.navigate('NewQuote')}>
                <Text style={{ color: colors.accent, fontWeight: 'bold' }}>+ Stwórz pierwszą</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {recentQuotes.map((quote) => (
                <TouchableOpacity 
                  key={quote.id}
                  style={[styles.quoteRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
                  onPress={() => navigation.navigate('QuoteDetails', { quoteId: quote.id })}
                >
                  <View style={[styles.quoteIcon, { backgroundColor: colors.surfaceSubtle }]}>
                    <FileText size={20} color={colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.quoteClient, { color: colors.text }]}>
                      {quote.clientFirstName} {quote.clientLastName}
                    </Text>
                    <Text style={[styles.quoteNumber, { color: colors.textMuted }]}>
                      {quote.number} • {quote.date}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.quoteAmount, { color: colors.text }]}>
                      {quote.totalNet.toFixed(0)} zł
                    </Text>
                    <StatusBadge status={quote.status} colors={colors} styles={styles} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </View>
  );
};

const ActionCard = ({ title, icon, color, textColor, border, iconColor, onPress, styles }: any) => (
  <TouchableOpacity 
    style={[
      styles.actionCard, 
      { backgroundColor: color, borderColor: border || 'transparent', borderWidth: border ? 1 : 0 }
    ]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={{ marginBottom: 12 }}>
      {iconColor ? React.cloneElement(icon, { color: iconColor }) : icon}
    </View>
    <Text style={[styles.actionCardText, { color: textColor || '#fff' }]}>{title}</Text>
  </TouchableOpacity>
);

const StatusBadge = ({ status, colors, styles }: any) => {
  let bg = colors.surfaceSubtle;
  let text = colors.textMuted;

  if (status === 'zaakceptowana') {
    bg = colors.successBg;
    text = colors.success;
  } else if (status === 'wysłana') {
    bg = colors.accentLight;
    text = colors.accent;
  }

  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text style={[styles.statusText, { color: text }]}>{status}</Text>
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  summaryCard: {
    padding: 24,
    borderRadius: 24,
    marginBottom: 32,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  divider: {
    width: 1,
    height: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 32,
  },
  actionDock: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    height: 100,
    justifyContent: 'space-between',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionCardText: {
    fontSize: 13,
    fontWeight: '700',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
    gap: 12,
  },
  alertIcon: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  alertTitle: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2,
  },
  alertDesc: {
    fontSize: 12,
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 2, // Spacing between rows handled by parent gap
  },
  quoteIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  quoteClient: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
  },
  quoteNumber: {
    fontSize: 12,
  },
  quoteAmount: {
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  emptyState: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center'
  }
});

export default Dashboard;
