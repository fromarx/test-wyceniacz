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
import * as Notifications from 'expo-notifications';

import PaywallScreen from '../components/PaywallScreen';
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

const FORCE_DEV_MODE = true;

const upsert = async (table: string, item: any) => {
  // Serializuj tablice i obiekty do JSON przed zapisem
  const serializedItem: any = { ...item };
  
  if (table === 'services') {
    if (serializedItem.defaultMaterials) {
      serializedItem.defaultMaterials = JSON.stringify(serializedItem.defaultMaterials);
    }
  }
  
  if (table === 'clients') {
    if (serializedItem.reminders) {
      serializedItem.reminders = JSON.stringify(serializedItem.reminders);
    }
  }

  if (table === 'quotes') {
    // FIX: Sprawdzamy czy items to tablica zanim zrobimy stringify
    if (serializedItem.items && typeof serializedItem.items !== 'string') {
      serializedItem.items = JSON.stringify(serializedItem.items);
    }
  }

  const keys = Object.keys(serializedItem);
  const placeholders = keys.map(() => '?').join(',');

  await executeSql(
      `INSERT OR REPLACE INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`,
      Object.values(serializedItem)
    );
};

// Helper do bezpiecznego parsowania JSON (naprawia problem "podwójnego stringa")
const safeParseJSON = (input: any) => {
  try {
    if (!input) return [];
    if (Array.isArray(input)) return input;
    if (typeof input === 'string') {
      const parsed = JSON.parse(input);
      // Jeśli po pierwszym parsowaniu to nadal string, parsujemy drugi raz (fix dla double stringify)
      if (typeof parsed === 'string') return JSON.parse(parsed);
      return parsed;
    }
    return [];
  } catch (e) {
    console.warn("Błąd parsowania JSON:", e);
    return [];
  }
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
  requestNotificationPermission(): Promise<void>;
  exportAllData(): Promise<string>;
}

const initialState: AppState = {
  user: null,
  services: [],
  categories: [],
  clients: [],
  quotes: [],
  shoppingLists: [],
  darkMode: true,
  subscriptionStatus: SubscriptionStatus.ACTIVE, // TESTY: Zawsze aktywna
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

  const setActiveScreen = useCallback((name: string) => {
    setState(prev => ({ ...prev, activeScreenName: name }));
  }, []);

const checkSubscription = useCallback(async (): Promise<SubscriptionStatus> => {
    // 👇 Najpierw sprawdzamy tryb wymuszony (zanim wejdziemy w try-catch)
    if (FORCE_DEV_MODE) {
        console.log("FORCE DEV MODE: Subskrypcja aktywna");
        return SubscriptionStatus.ACTIVE;
    }

    // 👇 Dopiero potem ewentualnie RevenueCat (w trybie produkcji)
    try {
      if (!(await Purchases.isConfigured())) {
        return SubscriptionStatus.NONE;
      }
      const info: CustomerInfo = await Purchases.getCustomerInfo();
      return info.entitlements.active['Fromed Pro']
        ? SubscriptionStatus.ACTIVE
        : SubscriptionStatus.NONE;
    } catch (e) {
      console.warn("Błąd sprawdzania subskrypcji:", e);
      return SubscriptionStatus.NONE;
    }
  }, []);

  /* ============================= */
  /* ===== INIT ================= */
  /* ============================= */
useEffect(() => {
  let mounted = true;

  (async () => {
    try {
      await initDatabase();
      const db = await getDbConnection();

      // --- 👇 ZMIANA ZACZYNA SIĘ TUTAJ 👇 ---
      
     if (!FORCE_DEV_MODE) { 
          // Tylko jeśli NIE jesteśmy w trybie wymuszonym, próbujemy łączyć się z RevenueCat
          try {
            if (!(await Purchases.isConfigured())) {
              const apiKey = Platform.select({
                ios: 'twoj_klucz_ios',
                android: 'test_aJPikIwIYUvlNeohuVTKgNQYcDq' 
              })!;
              await Purchases.configure({ apiKey });
            }
          } catch (rcError) {
            console.warn("Błąd RC:", rcError);
          }
      }


        const subscriptionStatus = await checkSubscription();

        const [
          userRaw,
          darkModeRaw,
          quotesRaw,
          servicesRaw,
          categoriesRaw,
          clientsRaw,
          shoppingListsRaw
        ] = await Promise.all([
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('darkMode'),
          db.getAllAsync<any>('SELECT * FROM quotes ORDER BY date DESC LIMIT ?', [QUOTES_PER_PAGE]),
          db.getAllAsync<any>('SELECT * FROM services'),
          db.getAllAsync<Category>('SELECT * FROM categories'),
          db.getAllAsync<any>('SELECT * FROM clients'),
          db.getAllAsync<any>('SELECT * FROM shoppingLists')
        ]);

        // Deserializuj JSON z bazy danych
        const quotes: Quote[] = (quotesRaw || []).map(mapQuoteFromDb);

        const services: Service[] = (servicesRaw || []).map((s: any) => ({
          ...s,
          defaultMaterials: safeParseJSON(s.defaultMaterials)
        }));

        const clients: Client[] = (clientsRaw || []).map((c: any) => ({
          ...c,
          reminders: safeParseJSON(c.reminders)
        }));

        let categories = categoriesRaw || [];
        if (!categories.some(c => c.name.toLowerCase() === 'ogólna')) {
          const general: Category = { id: 'cat_general', name: 'Ogólna' };
          await db.runAsync(
            'INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)',
            [general.id, general.name]
          );
          categories = [general, ...categories];
        }

        const shoppingLists: ShoppingList[] = (shoppingListsRaw || []).map(l => ({
          ...l,
          items: safeParseJSON(l.items)
        }));

        if (mounted) {
          setState(s => ({
            ...s,
            user: userRaw
              ? JSON.parse(userRaw)
              : {
                  id: `mob_${Date.now()}`,
                  email: '',
                  firstName: '',
                  lastName: '',
                  companyName: '',
                  address: '',
                  city: '',
                  postalCode: ''
                },
            darkMode: darkModeRaw !== 'false',
            quotes: quotes || [],
            services: services || [],
            categories,
            clients: clients || [],
            shoppingLists,
            subscriptionStatus,
            hasMoreQuotes: (quotes || []).length === QUOTES_PER_PAGE
          }));
        }
      } finally {
        if (mounted) setIsReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [checkSubscription]);

  /* ============================= */
  /* ===== QUOTES =============== */
  /* ============================= */

  const mapQuoteToDb = (q: Quote) => ({
    id: q.id,
    number: q.number,
    date: q.date,
    clientId: q.clientId,
    clientFirstName: q.clientFirstName,
    clientLastName: q.clientLastName,
    clientPhone: q.clientPhone,
    clientEmail: q.clientEmail,
    clientCompany: q.clientCompany,
    clientNip: q.clientNip,
    serviceStreet: q.serviceStreet,
    serviceHouseNo: q.serviceHouseNo,
    serviceApartmentNo: q.serviceApartmentNo,
    servicePostalCode: q.servicePostalCode,
    serviceCity: q.serviceCity,
    estimatedCompletionDate: q.estimatedCompletionDate,
    status: q.status,
    totalNet: q.totalNet,
    totalVat: q.totalVat,
    totalGross: q.totalGross,
    // FIX: Używamy items jako stringa tylko raz
    items: typeof q.items === 'string' ? q.items : JSON.stringify(q.items ?? []),
  });

  const mapQuoteFromDb = (row: any): Quote => ({
    id: row.id,
    number: row.number,
    date: row.date,
    clientId: row.clientId,
    clientFirstName: row.clientFirstName,
    clientLastName: row.clientLastName,
    clientPhone: row.clientPhone,
    clientEmail: row.clientEmail,
    clientCompany: row.clientCompany,
    clientNip: row.clientNip,
    serviceStreet: row.serviceStreet,
    serviceHouseNo: row.serviceHouseNo || row.houseNo,
    serviceApartmentNo: row.serviceApartmentNo || row.apartmentNo,
    servicePostalCode: row.servicePostalCode || row.postalCode,
    serviceCity: row.serviceCity || row.city,
    estimatedCompletionDate: row.estimatedCompletionDate,
    status: row.status,
    totalNet: row.totalNet,
    totalVat: row.totalVat,
    totalGross: row.totalGross,
    // FIX: Używamy helpera safeParseJSON
    items: safeParseJSON(row.items),
  });

  const mapListToDb = (l: ShoppingList) => ({
    id: l.id,
    name: l.name,
    createdAt: l.createdAt,
    items: JSON.stringify(l.items ?? [])
  });

  const fetchQuotes = useCallback(
    async (page: number, append: boolean) => {
      if (isLoadingQuotes) return;
      setIsLoadingQuotes(true);

      try {
        const offset = page * QUOTES_PER_PAGE;
        const rowsRaw = await executeSql<any>(
          'SELECT * FROM quotes ORDER BY date DESC LIMIT ? OFFSET ?',
          [QUOTES_PER_PAGE, offset]
        );

        const rows: Quote[] = (rowsRaw || []).map(mapQuoteFromDb);

        setState(s => ({
          ...s,
          quotes: append ? [...s.quotes, ...rows] : rows,
          currentQuotesPage: page,
          hasMoreQuotes: rows.length === QUOTES_PER_PAGE
        }));
      } finally {
        setIsLoadingQuotes(false);
      }
    },
    [isLoadingQuotes]
  );

  const loadNextQuotesPage = () => fetchQuotes(state.currentQuotesPage + 1, true);
  const refreshQuotes = () => fetchQuotes(0, false);

  /* ============================= */
  /* ===== CRUD ================= */
  /* ============================= */
  const updateUser = async (user: User) => {
    await AsyncStorage.setItem('user', JSON.stringify(user));
    setState(s => ({ ...s, user }));
  };

  const toggleDarkMode = async () => {
    const value = !state.darkMode;
    await AsyncStorage.setItem('darkMode', String(value));
    setState(s => ({ ...s, darkMode: value }));
  };

  const addQuote = async (q: Quote) => {
    const dbItem = mapQuoteToDb(q);
    await upsert('quotes', dbItem);
    setState(s => ({ ...s, quotes: [q, ...s.quotes] }));
  };

  const updateQuote = async (q: Quote) => {
    const dbItem = mapQuoteToDb(q);
    await upsert('quotes', dbItem);
    setState(s => ({ ...s, quotes: s.quotes.map(x => (x.id === q.id ? q : x)) }));
  };

  const deleteQuote = async (id: string) => {
    await executeSql('DELETE FROM quotes WHERE id = ?', [id]);
    setState(s => ({ ...s, quotes: s.quotes.filter(q => q.id !== id) }));
  };

  const addClient = async (c: Client) => {
    await upsert('clients', c);
    setState(s => ({ ...s, clients: [c, ...s.clients] }));
  };

  const updateClient = async (c: Client) => {
    await upsert('clients', c);
    setState(s => ({ ...s, clients: s.clients.map(x => (x.id === c.id ? c : x)) }));
  };

  const deleteClient = async (id: string) => {
    await executeSql('DELETE FROM clients WHERE id = ?', [id]);
    setState(s => ({ ...s, clients: s.clients.filter(c => c.id !== id) }));
  };

  const addService = async (service: Service) => {
    await upsert('services', service);
    setState(prev => ({ ...prev, services: [...prev.services, service] }));
  };

  const updateService = async (service: Service) => {
    await upsert('services', service);
    setState(prev => ({ ...prev, services: prev.services.map(x => (x.id === service.id ? service : x)) }));
  };

  const deleteService = async (id: string) => {
    await executeSql('DELETE FROM services WHERE id = ?', [id]);
    setState(s => ({ ...s, services: s.services.filter(x => x.id !== id) }));
  };

  const addCategory = async (c: Category) => {
    await upsert('categories', c);
    setState(s => ({ ...s, categories: [...s.categories, c] }));
  };

  const deleteCategory = async (id: string) => {
    if (id === 'cat_general') {
      Alert.alert('Błąd', 'Nie można usunąć kategorii systemowej.');
      return;
    }

    await executeSql('DELETE FROM categories WHERE id = ?', [id]);
    await executeSql(
      'UPDATE services SET categoryId = ? WHERE categoryId = ?',
      ['cat_general', id]
    );

    setState(s => ({
      ...s,
      categories: s.categories.filter(c => c.id !== id),
      services: s.services.map(serv =>
        serv.categoryId === id ? { ...serv, categoryId: 'cat_general' } : serv
      )
    }));
  };

  const addShoppingList = async (l: ShoppingList) => {
    await upsert('shoppingLists', mapListToDb(l));
    setState(s => ({
      ...s,
      shoppingLists: [l, ...s.shoppingLists]
    }));
  };

  const updateShoppingList = async (l: ShoppingList) => {
    await upsert('shoppingLists', mapListToDb(l));
    setState(s => ({
      ...s,
      shoppingLists: s.shoppingLists.map(x => (x.id === l.id ? l : x))
    }));
  };

  const deleteShoppingList = async (id: string) => {
    await executeSql('DELETE FROM shoppingLists WHERE id = ?', [id]);
    setState(s => ({
      ...s,
      shoppingLists: s.shoppingLists.filter(x => x.id !== id)
    }));
  };

  const retrySubscriptionCheck = async () => {
    setState(s => ({ ...s, subscriptionStatus: SubscriptionStatus.NONE }));
  };

  const requestNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Uprawnienia", "Włącz powiadomienia w ustawieniach, aby otrzymywać przypomnienia.");
    }
  };

  const exportAllData = async (): Promise<string> => {
    const db = await getDbConnection();
    const [quotes, services, categories, clients, shoppingListsRaw] = await Promise.all([
      db.getAllAsync<Quote>('SELECT * FROM quotes'),
      db.getAllAsync<Service>('SELECT * FROM services'),
      db.getAllAsync<Category>('SELECT * FROM categories'),
      db.getAllAsync<Client>('SELECT * FROM clients'),
      db.getAllAsync<any>('SELECT * FROM shoppingLists')
    ]);

    const shoppingLists: ShoppingList[] = (shoppingListsRaw || []).map(l => ({
      ...l,
      items: safeParseJSON(l.items)
    }));

    const exportData = {
      user: state.user,
      quotes,
      services,
      categories,
      clients,
      shoppingLists,
      exportDate: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  };

  const value = useMemo<AppContextType>(
    () => ({
      state,
      setActiveScreen,
      updateUser,
      toggleDarkMode,
      loadNextQuotesPage,
      refreshQuotes,
      addQuote,
      updateQuote,
      deleteQuote,
      addClient,
      updateClient,
      deleteClient,
      addService,
      updateService,
      deleteService,
      addCategory,
      deleteCategory,
      addShoppingList,
      updateShoppingList,
      deleteShoppingList,
      retrySubscriptionCheck,
      requestNotificationPermission,
      exportAllData
    }),
    [state]
  );

  /* ============================= */
  /* ===== RENDER =============== */
  /* ============================= */
  if (!isReady || state.subscriptionStatus === SubscriptionStatus.CHECKING) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.text}>Inicjalizacja systemu…</Text>
      </View>
    );
  }

  /* TESTY: Wyłączony Paywall
  if (state.subscriptionStatus !== SubscriptionStatus.ACTIVE) {
    return (
      <PaywallScreen
        onSuccess={async () => {
          const status = await checkSubscription();
          setState(s => ({ ...s, subscriptionStatus: status }));
        }}
      />
    );
  }
  */

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

/* ============================= */
/* ===== HOOK ================== */
/* ============================= */
export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used inside AppProvider');
  }
  return ctx;
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617'
  },
  text: {
    marginTop: 15,
    color: '#94a3b8',
    fontWeight: '600'
  }
});
