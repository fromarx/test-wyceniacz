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
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';

import { initDatabase, getDbConnection } from '../db/db';
import { presentPaywall } from './Paywall';

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

const executeSql = async <T,>(
  sql: string,
  params: any[] = []
): Promise<T[]> => {
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
    `
    INSERT INTO ${table} (${keys.join(',')})
    VALUES (${placeholders})
    ON CONFLICT(id) DO UPDATE SET ${assignments}
  `,
    Object.values(item)
  );
};

/* ============================= */
/* ===== CONTEXT =============== */
/* ============================= */

interface AppContextType {
  state: AppState;
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
  currentQuotesPage: 0
};

const AppContext = createContext<AppContextType | null>(null);

/* ============================= */
/* ===== PROVIDER ============== */
/* ============================= */

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(initialState);
  const [isReady, setIsReady] = useState(false);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);

  /* ---------- SUBSCRIPTION ---------- */

  const checkSubscription = useCallback(async (): Promise<SubscriptionStatus> => {
    try {
      const info: CustomerInfo = await Purchases.getCustomerInfo();
      return info.entitlements.active['Pro']
        ? SubscriptionStatus.ACTIVE
        : SubscriptionStatus.NONE;
    } catch {
      return SubscriptionStatus.NONE;
    }
  }, []);

  /* ---------- QUOTES ---------- */

  const fetchQuotes = useCallback(
    async (page: number, append: boolean) => {
      if (isLoadingQuotes) return;

      setIsLoadingQuotes(true);
      try {
        const offset = page * QUOTES_PER_PAGE;
        const rows = await executeSql<Quote>(
          `SELECT * FROM quotes ORDER BY date DESC LIMIT ? OFFSET ?`,
          [QUOTES_PER_PAGE, offset]
        );

        setState(prev => ({
          ...prev,
          quotes: append ? [...prev.quotes, ...rows] : rows,
          currentQuotesPage: page,
          hasMoreQuotes: rows.length === QUOTES_PER_PAGE
        }));
      } catch {
        Alert.alert('Błąd', 'Nie udało się pobrać wycen');
      } finally {
        setIsLoadingQuotes(false);
      }
    },
    [isLoadingQuotes]
  );

  /* ---------- INIT ---------- */

  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();

        const apiKey = Platform.select({
          ios: 'test_aJPikIwIYUvlNeohuVTKgNQYcDq',
          android: 'test_aJPikIwIYUvlNeohuVTKgNQYcDq'
        });

        let subscriptionStatus = SubscriptionStatus.NONE;

        if (apiKey && !apiKey.includes('KLUCZ')) {
          Purchases.setLogLevel(LOG_LEVEL.ERROR);
          await Purchases.configure({ apiKey });
          subscriptionStatus = await checkSubscription();

          Purchases.addCustomerInfoUpdateListener(info => {
            const active = !!info.entitlements.active['Pro'];
            setState(s => ({
              ...s,
              subscriptionStatus: active
                ? SubscriptionStatus.ACTIVE
                : SubscriptionStatus.NONE
            }));
          });
        }

        const [userRaw, darkModeRaw] = await Promise.all([
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('darkMode')
        ]);

        const user: User =
          userRaw ??
          JSON.stringify({
            id: `mob_${Date.now()}`,
            email: '',
            firstName: '',
            lastName: ''
          });

        const [quotes, services, categories, clients, shoppingLists] =
          await Promise.all([
            executeSql<Quote>(
              `SELECT * FROM quotes ORDER BY date DESC LIMIT ?`,
              [QUOTES_PER_PAGE]
            ),
            executeSql<Service>('SELECT * FROM services'),
            executeSql<Category>('SELECT * FROM categories'),
            executeSql<Client>('SELECT * FROM clients'),
            executeSql<ShoppingList>('SELECT * FROM shoppingLists')
          ]);

        setState({
          user: JSON.parse(user),
          darkMode: darkModeRaw !== 'false',
          quotes,
          services,
          categories,
          clients,
          shoppingLists,
          subscriptionStatus,
          currentQuotesPage: 0,
          hasMoreQuotes: quotes.length === QUOTES_PER_PAGE
        });
      } catch (e) {
        console.error(e);
      } finally {
        setIsReady(true);
      }
    };

    init();
  }, [checkSubscription]);

  /* ---------- ACTIONS ---------- */

  const updateUser = async (user: User) => {
    await AsyncStorage.setItem('user', JSON.stringify(user));
    setState(s => ({ ...s, user }));
  };

  const toggleDarkMode = async () => {
    const value = !state.darkMode;
    await AsyncStorage.setItem('darkMode', String(value));
    setState(s => ({ ...s, darkMode: value }));
  };

  const loadNextQuotesPage = () =>
    fetchQuotes(state.currentQuotesPage + 1, true);

  const refreshQuotes = () => fetchQuotes(0, false);

  const addQuote = async (q: Quote) => {
    await upsert('quotes', q);
    setState(s => ({ ...s, quotes: [q, ...s.quotes] }));
  };

  const updateQuote = async (q: Quote) => {
    await upsert('quotes', q);
    setState(s => ({
      ...s,
      quotes: s.quotes.map(x => (x.id === q.id ? q : x))
    }));
  };

  const deleteQuote = async (id: string) => {
    await executeSql('DELETE FROM quotes WHERE id = ?', [id]);
    setState(s => ({
      ...s,
      quotes: s.quotes.filter(q => q.id !== id)
    }));
  };

  const addClient = async (c: Client) => {
    await upsert('clients', c);
    setState(s => ({ ...s, clients: [c, ...s.clients] }));
  };

  const updateClient = async (c: Client) => {
    await upsert('clients', c);
    setState(s => ({
      ...s,
      clients: s.clients.map(x => (x.id === c.id ? c : x))
    }));
  };

  const deleteClient = async (id: string) => {
    await executeSql('DELETE FROM clients WHERE id = ?', [id]);
    setState(s => ({
      ...s,
      clients: s.clients.filter(c => c.id !== id)
    }));
  };

  const addService = async (s: Service) => {
    await upsert('services', s);
    setState(st => ({ ...st, services: [...st.services, s] }));
  };

  const updateService = async (s: Service) => {
    await upsert('services', s);
    setState(st => ({
      ...st,
      services: st.services.map(x => (x.id === s.id ? s : x))
    }));
  };

  const deleteService = async (id: string) => {
    await executeSql('DELETE FROM services WHERE id = ?', [id]);
    setState(st => ({
      ...st,
      services: st.services.filter(s => s.id !== id)
    }));
  };

  const retrySubscriptionCheck = async () => {
    setState(s => ({ ...s, subscriptionStatus: SubscriptionStatus.CHECKING }));
    const status = await checkSubscription();

    if (status === SubscriptionStatus.NONE) {
      const purchased = await presentPaywall();
      setState(s => ({
        ...s,
        subscriptionStatus: purchased
          ? SubscriptionStatus.ACTIVE
          : SubscriptionStatus.NONE
      }));
      return;
    }

    setState(s => ({ ...s, subscriptionStatus: status }));
  };

  /* ---------- CONTEXT ---------- */

  const value = useMemo<AppContextType>(
    () => ({
      state,
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
      retrySubscriptionCheck
    }),
    [state]
  );

  if (!isReady) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
        <Text>Ładowanie…</Text>
      </View>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

/* ============================= */

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be inside AppProvider');
  return ctx;
};

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
