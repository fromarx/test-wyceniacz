import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppProvider, useAppContext } from './store/AppContext';
import { ToastProvider } from './components/Toast';
import { SubscriptionStatus, QuoteStatus } from './types';
import { getThemeColors, getShadows } from './utils/theme';

import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';

import {
  ShoppingBag,
  FileText,
  Users,
  Hammer,
  UserCircle,
  Plus,
  Moon,
  Sun,
  LayoutDashboard
} from 'lucide-react-native';

import Dashboard from './screens/Dashboard';
import ShoppingListScreen from './screens/ShoppingListScreen';
import ServicesList from './screens/ServicesList';
import QuoteList from './screens/QuoteList';
import NewQuote from './screens/NewQuote';
import QuoteDetails from './screens/QuoteDetails';
import Profile from './screens/Profile';
import ClientList from './screens/ClientList';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/* ==========================================================
   1. NOWOCZESNY HEADER (Turbo Edition)
   ========================================================== */
const ModernHeader = ({ navigation }: any) => {
  const { state, toggleDarkMode } = useAppContext();
  const { user, darkMode } = state;
  const colors = getThemeColors(darkMode);

  return (
    <SafeAreaView style={{ backgroundColor: colors.surface }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12, // More compact
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <View>
          <Text style={{ fontSize: 11, color: colors.accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Witaj ponownie
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 2 }}>
            {user?.companyName || 'Twoja Firma'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={toggleDarkMode}
            style={{
              padding: 8,
              borderRadius: 12,
              backgroundColor: colors.surfaceSubtle
            }}
          >
            {darkMode ? <Sun size={20} color={colors.warning} /> : <Moon size={20} color={colors.textSecondary} />}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('ProfileScreen')}>
            <View style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border
            }}>
              <UserCircle size={22} color={colors.textInverted} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

/* ==========================================================
   2. KOMPONENT DOLNEJ NAWIGACJI (TABS)
   ========================================================== */
const MainTabs = ({ navigation }: any) => {
  const { state } = useAppContext();
  const { darkMode, shoppingLists, quotes } = state;
  const colors = getThemeColors(darkMode);

  // Logic: Count INCOMPLETE shopping lists
  const activeShoppingCount = (shoppingLists || []).filter(l =>
    l.items && l.items.some(i => !i.isBought)
  ).length;

  // Logic: Count ACTIVE quotes (Draft or Sent)
  const activeQuotesCount = (quotes || []).filter(q =>
    q.status === QuoteStatus.DRAFT || q.status === QuoteStatus.SENT
  ).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ModernHeader navigation={navigation} />
      <Tab.Navigator
        id="MainTabs"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopWidth: 0,
            elevation: 0,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            height: 70, // Slightly more compact
            paddingBottom: 16,
            paddingTop: 12,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginTop: 4,
          }
        }}
      >
        <Tab.Screen
          name="MainDashboard"
          component={Dashboard}
          options={{
            tabBarLabel: 'Pulpit',
            tabBarIcon: ({ color, focused }) => <LayoutDashboard size={24} strokeWidth={focused ? 2.5 : 2} color={color} />,
          }}
        />
        <Tab.Screen
          name="Quotes"
          component={QuoteList}
          options={{
            tabBarLabel: 'Wyceny',
            tabBarIcon: ({ color, focused }) => <FileText size={24} strokeWidth={focused ? 2.5 : 2} color={color} />,
            tabBarBadge: activeQuotesCount > 0 ? activeQuotesCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: colors.danger,
              color: '#fff',
              fontSize: 10,
              fontWeight: 'bold',
            }
          }}
        />

        <Tab.Screen
          name="AddFast"
          component={NewQuote}
          options={{
            tabBarLabel: '',
            tabBarIcon: () => (
              <View style={{
                backgroundColor: colors.primary,
                width: 52,
                height: 52,
                borderRadius: 18,
                justifyContent: 'center',
                alignItems: 'center',
                top: -8,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 6
              }}>
                <Plus size={28} color={colors.textInverted} strokeWidth={3} />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e: any) => {
              e.preventDefault();
              navigation.navigate('NewQuote');
            },
          }}
        />

        <Tab.Screen
          name="Services"
          component={ServicesList}
          options={{
            tabBarLabel: 'Usługi',
            tabBarIcon: ({ color, focused }) => <Hammer size={24} strokeWidth={focused ? 2.5 : 2} color={color} />,
          }}
        />

        <Tab.Screen
          name="Clients"
          component={ClientList}
          options={{
            tabBarLabel: 'Klienci',
            tabBarIcon: ({ color, focused }) => <Users size={24} strokeWidth={focused ? 2.5 : 2} color={color} />,
          }}
        />
      </Tab.Navigator>
    </View>
  );
};

/* ==========================================================
   3. GŁÓWNY NAVIGATOR
   ========================================================== */
const AppNavigator = () => {
  const { state } = useAppContext();
  const colors = getThemeColors(state.darkMode);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const lockUI = async () => {
        try {
          await NavigationBar.setVisibilityAsync("hidden");
        } catch (error) {
          console.log('NavigationBar setup skipped:', error);
        }
      };
      lockUI();
    }
  }, []);

  if (state.subscriptionStatus === SubscriptionStatus.CHECKING || state.subscriptionStatus === SubscriptionStatus.NONE) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <StatusBar hidden={true} />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ marginTop: 15, color: colors.textMuted }}>Weryfikacja...</Text>
      </View>
    );
  }

  const isProfileComplete = !!(state.user?.companyName && state.user?.address);

  return (
    <NavigationContainer>
      <StatusBar hidden={true} />
      <Stack.Navigator id="RootStack" screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isProfileComplete ? (
          <Stack.Screen name="InitialProfile">
            {(props: any) => <Profile {...props} forced={true} />}
          </Stack.Screen>
        ) : (
          <Stack.Group>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="NewQuote" component={NewQuote} />
            <Stack.Screen name="QuoteDetails" component={QuoteDetails} />
            <Stack.Screen name="ShoppingListScreen" component={ShoppingListScreen} />
            <Stack.Screen name="ProfileScreen" component={Profile} />
            <Stack.Screen name="ClientList" component={ClientList} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <ToastProvider>
          <AppNavigator />
        </ToastProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}