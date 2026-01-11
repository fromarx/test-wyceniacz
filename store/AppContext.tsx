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

const upsert = async (table: string, item: any) => {
  const keys = Object.keys(item);
  const assignments = keys.map(k => `${k}=excluded.${k}`).join(',');
  const placeholders = keys.map(() => '?').join(',');

  await executeSql(
      `INSERT OR REPLACE INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`,
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

  const setActiveScreen = useCallback((name: string) => {
    setState(prev => ({ ...prev, activeScreenName: name }));
  }, []);

  const checkSubscription = useCallback(async (): Promise<SubscriptionStatus> => {
    try {
      if (!(await Purchases.isConfigured())) return SubscriptionStatus.NONE;
      const info: CustomerInfo = await Purchases.getCustomerInfo();
      return info.entitlements.active['Fromed Pro']
        ? SubscriptionStatus.ACTIVE
        : SubscriptionStatus.NONE;
    } catch {
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

        if (!(await Purchases.isConfigured())) {
          const apiKey = Platform.select({
            ios: 'twoj_klucz_ios',
            android: 'test_aJPikIwIYUvlNeohuVTKgNQYcDq'
          })!;
          await Purchases.configure({ apiKey });
        }

        const subscriptionStatus = await checkSubscription();

        const [
          userRaw,
          darkModeRaw,
          quotes,
          services,
          categoriesRaw,
          clients,
          shoppingListsRaw
        ] = await Promise.all([
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('darkMode'),
          db.getAllAsync<Quote>('SELECT * FROM quotes ORDER BY date DESC LIMIT ?', [QUOTES_PER_PAGE]),
          db.getAllAsync<Service>('SELECT * FROM services'),
          db.getAllAsync<Category>('SELECT * FROM categories'),
          db.getAllAsync<Client>('SELECT * FROM clients'),
          db.getAllAsync<any>('SELECT * FROM shoppingLists')
        ]);

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
          items: typeof l.items === 'string'
                     ? JSON.parse(l.items)
                     : Array.isArray(l.items)
                     ? l.items
                     : []
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
        const rows = await executeSql<Quote>(
          'SELECT * FROM quotes ORDER BY date DESC LIMIT ? OFFSET ?',
          [QUOTES_PER_PAGE, offset]
        );

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
    await upsert('quotes', q);
    setState(s => ({ ...s, quotes: [q, ...s.quotes] }));
  };

  const updateQuote = async (q: Quote) => {
    await upsert('quotes', q);
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

  const addService = async (s: Service) => {
    await upsert('services', s);
    setState(s => ({ ...s, services: [...s.services, s] }));
  };

  const updateService = async (s: Service) => {
    await upsert('services', s);
    setState(s => ({ ...s, services: s.services.map(x => (x.id === s.id ? s : x)) }));
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
      retrySubscriptionCheck
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
