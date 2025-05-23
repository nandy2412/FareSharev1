import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, ToastAndroid, Alert } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useRouter } from 'expo-router';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const showPopup = (msg) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert(msg);
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ride"
        options={{
          title: 'Ride',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'User Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="logout"
        options={{
          title: 'Logout',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="arrow.uturn.left" color={color} />,
          listeners: {
            tabPress: (e) => {
              e.preventDefault();
              signOut(auth)
                .then(() => {
                  showPopup('Logged out successfully');
                  router.replace('/login');
                })
                .catch((err) => {
                  console.error('Logout error', err);
                  showPopup('Error logging out. Please try again.');
                });
            },
          },
        }}
      />
    </Tabs>
  );
}
