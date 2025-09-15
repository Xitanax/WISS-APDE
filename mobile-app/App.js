import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import JobsScreen from './src/screens/JobsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import {AuthProvider} from './src/context/AuthContext';

const Tab = createBottomTabNavigator();

function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({route}) => ({
              tabBarIcon: ({focused, color, size}) => {
                let iconName;
                if (route.name === 'Jobs') {
                  iconName = 'work';
                } else if (route.name === 'Profile') {
                  iconName = 'person';
                }
                return <Icon name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: '#3b82f6',
              tabBarInactiveTintColor: 'gray',
              headerStyle: {backgroundColor: '#1e293b'},
              headerTintColor: '#f8fafc',
              tabBarStyle: {backgroundColor: '#1e293b'},
            })}>
            <Tab.Screen name="Jobs" component={JobsScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
