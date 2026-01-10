import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppProvider, useAppContext } from './store/AppContext';
import { SubscriptionStatus } from './types';

// Importy ekranów
import Dashboard from './screens/Dashboard';
import ServicesList from './screens/ServicesList';
import QuoteList from './screens/QuoteList';
import NewQuote from './screens/NewQuote';
import QuoteDetails from './screens/QuoteDetails';
import Profile from './screens/Profile';
import Purchase from './screens/Purchase';
import ClientList from './screens/ClientList';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { state } = useAppContext();

  // UWAGA: Jeśli status jest CHECKING, AppProvider i tak pokazuje loader,
  // więc tutaj sprawdzamy tylko stan końcowy.
  const isSubscribed = state.subscriptionStatus === SubscriptionStatus.ACTIVE;

  const isProfileComplete = !!(
    state.user?.companyName &&
    state.user?.address &&
    state.user?.city &&
    state.user?.postalCode
  );

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isSubscribed ? (
          <Stack.Screen name="Purchase" component={Purchase} />
        ) : !isProfileComplete ? (
          <Stack.Screen name="Profile">
            {(props) => <Profile {...props} forced={true} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={Dashboard} />
            <Stack.Screen name="Services" component={ServicesList} />
            <Stack.Screen name="Quotes" component={QuoteList} />
            <Stack.Screen name="NewQuote" component={NewQuote} />
            <Stack.Screen name="QuoteDetails" component={QuoteDetails} />
            <Stack.Screen name="Clients" component={ClientList} />
            <Stack.Screen name="Profile">
              {(props) => <Profile {...props} forced={false} />}
            </Stack.Screen>
          </>
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