import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, Platform, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppProvider, useAppContext } from './store/AppContext';
import { SubscriptionStatus } from './types';

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
  Sun
} from 'lucide-react-native';

import Dashboard from './screens/Dashboard';
import ServicesList from './screens/ServicesList';
import QuoteList from './screens/QuoteList';
import NewQuote from './screens/NewQuote';
import QuoteDetails from './screens/QuoteDetails';
import Profile from './screens/Profile';
import ClientList from './screens/ClientList';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/* ==========================================================
   1. GÓRNY HEADER (PROFIL + MOTYW)
   ========================================================== */
const CustomHeader = ({ navigation }: any) => {
  const { state, toggleDarkMode } = useAppContext();
  const darkMode = state.darkMode;

  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 15,
      paddingBottom: 10,
      backgroundColor: darkMode ? '#0f172a' : '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: darkMode ? '#1e293b' : '#e2e8f0',
    }}>
      {/* IKONA PROFILU (LEWA) - ZMIENIONO NAZWĘ NA 'SettingsTab' */}
      <TouchableOpacity onPress={() => navigation.navigate('ProfileScreen')}>
        <UserCircle size={32} color={darkMode ? '#f8fafc' : '#1e293b'} />
      </TouchableOpacity>

      <Text style={{ fontSize: 18, fontWeight: 'bold', color: darkMode ? '#f8fafc' : '#1e293b' }}>
        Wycena
      </Text>

      <TouchableOpacity onPress={toggleDarkMode}>
        {darkMode ? <Sun size={28} color="#fbbf24" /> : <Moon size={28} color="#1e293b" />}
      </TouchableOpacity>
    </View>
  );
};

/* ==========================================================
   2. KOMPONENT DOLNEJ NAWIGACJI (TABS)
   ========================================================== */
const MainTabs = ({ navigation }: any) => {
  const { state } = useAppContext();
  const darkMode = state.darkMode;

  return (
    <View style={{ flex: 1 }}>
      <CustomHeader navigation={navigation} />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#64748b',
          tabBarStyle: {
            backgroundColor: darkMode ? '#0f172a' : '#ffffff',
            borderTopColor: darkMode ? '#1e293b' : '#e2e8f0',
            height: 70,
            paddingBottom: 12,
            paddingTop: 8,
          },
        }}
      >
        <Tab.Screen
          name="MainDashboard"
          component={Dashboard}
          options={{
            tabBarLabel: 'Zakupy',
            tabBarIcon: ({ color }) => <ShoppingBag size={24} color={color} />,
          }}
        />
        <Tab.Screen
          name="Quotes"
          component={QuoteList}
          options={{
            tabBarLabel: 'Wyceny',
            tabBarIcon: ({ color }) => <FileText size={24} color={color} />,
          }}
        />

        <Tab.Screen
          name="AddFast"
          component={NewQuote}
          options={{
            tabBarLabel: '',
            tabBarIcon: () => (
              <View style={{
                backgroundColor: '#2563eb',
                width: 50,
                height: 50,
                borderRadius: 25,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
                elevation: 5,
                shadowColor: '#2563eb',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
              }}>
                <Plus size={30} color="#fff" />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate('NewQuote');
            },
          }}
        />

        <Tab.Screen
          name="Clients"
          component={ClientList}
          options={{
            tabBarLabel: 'Klienci',
            tabBarIcon: ({ color }) => <Users size={24} color={color} />,
          }}
        />

        {/* ZAMIENIONO PROFIL NA USŁUGI W NAVBARZE */}
        <Tab.Screen
          name="SettingsTab"
          component={ServicesList}
          options={{
            tabBarLabel: 'Usługi',
            tabBarIcon: ({ color }) => <Hammer size={24} color={color} />,
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

  useEffect(() => {
    if (Platform.OS === 'android') {
      const lockUI = async () => {
        try {
          await NavigationBar.setVisibilityAsync("hidden");
          // setBehaviorAsync nie jest wspierane z edge-to-edge, pomijamy
          // await NavigationBar.setBehaviorAsync("overlay-swipe");
        } catch (error) {
          // Ignoruj błędy związane z navigation bar
          console.log('NavigationBar setup skipped:', error);
        }
      };
      lockUI();
    }
  }, []);

  if (state.subscriptionStatus === SubscriptionStatus.CHECKING || state.subscriptionStatus === SubscriptionStatus.NONE) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: state.darkMode ? '#020617' : '#fff' }}>
        <StatusBar hidden={true} />
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 15, color: state.darkMode ? '#94a3b8' : '#64748b' }}>Weryfikacja...</Text>
      </View>
    );
  }

  const isProfileComplete = !!(state.user?.companyName && state.user?.address);

  return (
    <NavigationContainer>
      <StatusBar hidden={true} />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isProfileComplete ? (
          /* Ekran profilu przy pierwszym uruchomieniu */
          <Stack.Screen name="InitialProfile">
            {(props) => <Profile {...props} forced={true} />}
          </Stack.Screen>
        ) : (
          <Stack.Group>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="NewQuote" component={NewQuote} />
            <Stack.Screen name="QuoteDetails" component={QuoteDetails} />

            {/* DODANO EKRAN PROFILU DO STACKA, ABY HEADER MÓGŁ DO NIEGO NAWIGOWAĆ */}
            <Stack.Screen name="ProfileScreen" component={Profile} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppNavigator />
    </AppProvider>
  );
}