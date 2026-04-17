import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Écrans existants
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ServiceSelectionScreen from '../screens/ServiceSelectionScreen';
import AuditTypeSelectionScreen from '../screens/AuditTypeSelectionScreen';
import QuestionScreen from '../screens/QuestionScreen';
import RecapScreen from '../screens/RecapScreen';

// ⭐ NOUVEAUX ÉCRANS (Sprint 5)
import AuditsListScreen from '../screens/AuditsListScreen';
import AuditDetailScreen from '../screens/AuditDetailScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {/* Auth */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ headerShown: false }}
        />

        {/* Home Dashboard */}
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ headerShown: false }}
        />

        {/* Flow Audit */}
        <Stack.Screen 
          name="AuditTypeSelection" 
          component={AuditTypeSelectionScreen}
          options={{ 
            headerShown: true,
            title: 'Type d\'Audit',
            headerBackTitle: 'Retour',
          }}
        />

        <Stack.Screen 
          name="ServiceSelection" 
          component={ServiceSelectionScreen}
          options={{ 
            headerShown: true,
            title: 'Sélection Service',
            headerBackTitle: 'Retour',
          }}
        />

        <Stack.Screen 
          name="Question" 
          component={QuestionScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen 
          name="Recap" 
          component={RecapScreen}
          options={{ 
            headerShown: true,
            title: 'Récapitulatif',
            headerBackTitle: 'Retour',
          }}
        />

        {/* ⭐ NOUVEAUX : Mes Audits */}
        <Stack.Screen 
          name="AuditsList" 
          component={AuditsListScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen 
          name="AuditDetail" 
          component={AuditDetailScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
