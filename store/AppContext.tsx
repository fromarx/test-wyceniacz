import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode
} from 'react';
import { Platform, View, ActivityIndicator, Text, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

import { initDatabase, getDbConnection } from '../db/db';
import {
  AppState,
  User,
  Service,
  Quote,
  Category,
  Client,
  ShoppingList,
  SubscriptionStatus
} from '../types';

/* ============================= */
/* ===== PAYWALL HELPER ======== */
/* ============================= */
export async function presentPaywall(): Promise<boolean> {
  try {
    const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();
    return (
      paywallResult === PAYWALL_RESULT.PURCHASED ||
      paywallResult === PAYWALL_RESULT.RESTORED
    );
  } catch (e) {
    console.error("Paywall Error:", e);
    return false;
  }
}

const QUOTES_PER_PAGE = 20;

/* ============================= */
/* ===== DB HELPERS ============ */
/* ============================= */
const executeSql = async <T,>(sql: string, params: any[] = []): Promise<T[]> => {
  const db = await getDbConnection();
  if (sql.trim().toLowerCase().startsWith('select')) {
    return db.getAllAsync<T>(sql, params);
  }
  await db.runAsync(sql, params);
  return [];
};

const upsert = async (table: string, item: any) => {
  const keys = Object.keys(item);
  const assignments = keys.map(k => `${k}=excluded.${k}`).join(',');
  const placeholders = keys.map(() => '?').join(',');

  await executeSql(
    `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${assignments}`,
    Object.values(item)
  );
};

/* ============================= */
/* ===== CONTEXT TYPE ========== */
/* ============================= */
interface AppContextType {
  state: AppState;
  setActiveScreen: (name: string) => void;
  updateUser(user: User): Promise<void>;
  toggleDarkMode(): Promise<void>;
  loadNextQuotesPage(): Promise<void>;
  refreshQuotes(): Promise<void>;
  addQuote(q: Quote): Promise<void>;
  updateQuote(q: Quote): Promise<void>;
  deleteQuote(id: string): Promise<void>;
  addClient(c: Client): Promise<void>;
  updateClient(c: Client): Promise<void>;
  deleteClient(id: string): Promise<void>;
  addService(s: Service): Promise<void>;
  updateService(s: Service): Promise<void>;
  deleteService(id: string): Promise<void>;
  addCategory(c: Category): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  addShoppingList(l: ShoppingList): Promise<void>;
  updateShoppingList(l: ShoppingList): Promise<void>;
  deleteShoppingList(id: string): Promise<void>;
  retrySubscriptionCheck(): Promise<void>;
}

const initialState: AppState = {
  user: null,
  services: [],
  categories: [],
  clients: [],
  quotes: [],
  shoppingLists: [],
  darkMode: true,
  subscriptionStatus: SubscriptionStatus.CHECKING,
  hasMoreQuotes: true,
  currentQuotesPage: 0,
  activeScreenName: 'Dashboard'
};

const AppContext = createContext<AppContextType | null>(null);

/* ============================= */
/* ===== PROVIDER ============== */
/* ============================= */
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(initialState);
  const [isReady, setIsReady] = useState(false);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);

  // Funkcja zmiany nazwy ekranu w nagłówku
  const setActiveScreen = useCallback((name: string) => {
    setState(prev => ({ ...prev, activeScreenName: name }));
  }, []);

  const checkSubscription = useCallback(async (): Promise<SubscriptionStatus> => {
    try {
      if (!(await Purchases.isConfigured())) return SubscriptionStatus.NONE;
      const info: CustomerInfo = await Purchases.getCustomerInfo();
      const isActive = info.entitlements.active['Fromed Pro'] !== undefined;
      return isActive ? SubscriptionStatus.ACTIVE : SubscriptionStatus.NONE;
    } catch (e) {
      console.error("Subscription Error:", e);
      return SubscriptionStatus.NONE;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        await initDatabase();
        const db = await getDbConnection();

        if (!(await Purchases.isConfigured())) {
          const apiKey = Platform.select({
            ios: 'twoj_klucz_ios',
            android: 'test_aJPikIwIYUvlNeohuVTKgNQYcDq'
          }) || 'test_aJPikIwIYUvlNeohuVTKgNQYcDq';
          await Purchases.configure({ apiKey });
        }

        const subStatus = await checkSubscription();

        const [userRaw, darkModeRaw, quotes, services, categoriesRaw, clients, shoppingListsRaw] = await Promise.all([
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('darkMode'),
          db.getAllAsync<Quote>(`SELECT * FROM quotes ORDER BY date DESC LIMIT ?`, [QUOTES_PER_PAGE]),
          db.getAllAsync<Service>('SELECT * FROM services'),
          db.getAllAsync<Category>('SELECT * FROM categories'),
          db.getAllAsync<Client>('SELECT * FROM clients'),
          db.getAllAsync<any>('SELECT * FROM shoppingLists')
        ]);

        // LOGIKA DOMYŚLNEJ KATEGORII
        let finalCategories = categoriesRaw || [];
        const hasGeneral = finalCategories.some(c => c.name.toLowerCase() === 'ogólna');

        if (!hasGeneral) {
          const generalCat: Category = { id: 'cat_general', name: 'Ogólna' };
          await db.runAsync('INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)', [generalCat.id, generalCat.name]);
          finalCategories = [generalCat, ...finalCategories];
        }

        const shoppingLists: ShoppingList[] = (shoppingListsRaw || []).map((list: any) => ({
          ...list,
          items: typeof list.items === 'string' ? JSON.parse(list.items) : []
        }));

        if (isMounted) {
          setState(prev => ({
            ...prev,
            user: userRaw ? JSON.parse(userRaw) : {
                id: `mob_${Date.now()}`,
                email: '', firstName: '', lastName: '',
                companyName: '', address: '', city: '', postalCode: ''
            },
            darkMode: darkModeRaw !== 'false',
            quotes: quotes || [],
            services: services || [],
            categories: finalCategories,
            clients: clients || [],
            shoppingLists: shoppingLists,
            subscriptionStatus: subStatus,
            hasMoreQuotes: (quotes || []).length === QUOTES_PER_PAGE
          }));
        }
      } catch (e) {
        console.error("KRYTYCZNY BŁĄD INIT W CONTEXT:", e);
      } finally {
        if (isMounted) setIsReady(true);
      }
    };
    init();
    return () => { isMounted = false; };
  }, [checkSubscription]);

  // --- HANDLERS ---
  const updateUser = async (user: User) => {
    await AsyncStorage.setItem('user', JSON.stringify(user));
    setState(s => ({ ...s, user }));
  };

  const toggleDarkMode = async () => {
    const value = !state.darkMode;
    await AsyncStorage.setItem('darkMode', String(value));
    setState(s => ({ ...s, darkMode: value }));
  };

  const fetchQuotes = useCallback(async (page: number, append: boolean) => {
    if (isLoadingQuotes) return;
    setIsLoadingQuotes(true);
    try {
      const offset = page * QUOTES_PER_PAGE;
      const rows = await executeSql<Quote>(`SELECT * FROM quotes ORDER BY date DESC LIMIT ? OFFSET ?`, [QUOTES_PER_PAGE, offset]);
      setState(prev => ({
        ...prev,
        quotes: append ? [...prev.quotes, ...rows] : rows,
        currentQuotesPage: page,
        hasMoreQuotes: rows.length === QUOTES_PER_PAGE
      }));
    } finally {
      setIsLoadingQuotes(false);
    }
  }, [isLoadingQuotes]);

  const loadNextQuotesPage = () => fetchQuotes(state.currentQuotesPage + 1, true);
  const refreshQuotes = () => fetchQuotes(0, false);

  const addQuote = async (q: Quote) => { await upsert('quotes', q); setState(s => ({ ...s, quotes: [q, ...s.quotes] })); };
  const updateQuote = async (q: Quote) => { await upsert('quotes', q); setState(s => ({ ...s, quotes: s.quotes.map(x => (x.id === q.id ? q : x)) })); };
  const deleteQuote = async (id: string) => { await executeSql('DELETE FROM quotes WHERE id = ?', [id]); setState(s => ({ ...s, quotes: s.quotes.filter(q => q.id !== id) })); };

  const addClient = async (c: Client) => { await upsert('clients', c); setState(s => ({ ...s, clients: [c, ...s.clients] })); };
  const updateClient = async (c: Client) => { await upsert('clients', c); setState(s => ({ ...s, clients: s.clients.map(x => (x.id === c.id ? c : x)) })); };
  const deleteClient = async (id: string) => { await executeSql('DELETE FROM clients WHERE id = ?', [id]); setState(s => ({ ...s, clients: s.clients.filter(c => c.id !== id) })); };

  const addService = async (s: Service) => { await upsert('services', s); setState(st => ({ ...st, services: [...st.services, s] })); };
  const updateService = async (s: Service) => { await upsert('services', s); setState(st => ({ ...st, services: st.services.map(x => (x.id === s.id ? s : x)) })); };
  const deleteService = async (id: string) => { await executeSql('DELETE FROM services WHERE id = ?', [id]); setState(st => ({ ...st, services: st.services.filter(serv => serv.id !== id) })); };

  const addCategory = async (c: Category) => { await upsert('categories', c); setState(s => ({ ...s, categories: [...s.categories, c] })); };
  const deleteCategory = async (id: string) => {
    if (id === 'cat_general') { Alert.alert("Błąd", "Nie można usunąć kategorii systemowej."); return; }
    await executeSql('DELETE FROM categories WHERE id = ?', [id]);
    await executeSql('UPDATE services SET categoryId = ? WHERE categoryId = ?', ['cat_general', id]);
    setState(s => ({
      ...s,
      categories: s.categories.filter(cat => cat.id !== id),
      services: s.services.map(serv => serv.categoryId === id ? { ...serv, categoryId: 'cat_general' } : serv)
    }));
  };

  const addShoppingList = async (l: ShoppingList) => {
    const dataToSave = { id: l.id, name: l.name, createdAt: l.createdAt, items: JSON.stringify(l.items) };
    await upsert('shoppingLists', dataToSave);
    setState(s => ({ ...s, shoppingLists: [l, ...s.shoppingLists] }));
  };

  const updateShoppingList = async (l: ShoppingList) => {
    const dataToSave = { id: l.id, name: l.name, createdAt: l.createdAt, items: JSON.stringify(l.items) };
    await upsert('shoppingLists', dataToSave);
    setState(s => ({ ...s, shoppingLists: s.shoppingLists.map(x => (x.id === l.id ? l : x)) }));
  };

  const deleteShoppingList = async (id: string) => {
    await executeSql('DELETE FROM shoppingLists WHERE id = ?', [id]);
    setState(s => ({ ...s, shoppingLists: s.shoppingLists.filter(l => l.id !== id) }));
  };

  const retrySubscriptionCheck = async () => {
    const success = await presentPaywall();
    if (success) {
      const status = await checkSubscription();
      setState(s => ({ ...s, subscriptionStatus: status }));
    }
  };

  const value = useMemo<AppContextType>(() => ({
    state, setActiveScreen, updateUser, toggleDarkMode, loadNextQuotesPage, refreshQuotes,
    addQuote, updateQuote, deleteQuote, addClient, updateClient, deleteClient,
    addService, updateService, deleteService, addCategory, deleteCategory,
    retrySubscriptionCheck, addShoppingList, updateShoppingList, deleteShoppingList
  }), [state, fetchQuotes, checkSubscription, setActiveScreen]);

  if (!isReady) {
    return (
      <View style={[styles.loader, { backgroundColor: state.darkMode ? '#020617' : '#fff' }]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 15, fontWeight: '600', color: state.darkMode ? '#94a3b8' : '#64748b' }}>Inicjalizacja systemu...</Text>
      </View>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be inside AppProvider');
  return ctx;
};

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});