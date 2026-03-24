import React from 'react';
import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { theme } from '@/constants/theme';

const tabBarStyle = {
  backgroundColor: theme.colors.surface,
  borderTopColor: theme.colors.border,
  borderTopWidth: 1,
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.tabIconSelected,
        tabBarInactiveTintColor: theme.colors.tabIconDefault,
        tabBarStyle,
        headerShown: false,
        headerStyle: {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
          borderBottomWidth: 1,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontSize: theme.typography.title.fontSize,
          fontWeight: theme.typography.title.fontWeight,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'square.grid.2x2.fill',
                android: 'dashboard',
                web: 'dashboard',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Команды',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'person.3.fill',
                android: 'group',
                web: 'group',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="players"
        options={{
          title: 'Игроки',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'person.2.fill',
                android: 'people',
                web: 'people',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Сообщения',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'bubble.left.and.bubble.right.fill',
                android: 'chat',
                web: 'chat',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Ещё',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'line.3.horizontal',
                android: 'menu',
                web: 'menu',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
