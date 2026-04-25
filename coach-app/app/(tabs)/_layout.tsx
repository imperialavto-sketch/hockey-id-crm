import React from 'react';
import { Tabs } from 'expo-router';
import { SymbolViewMaterial } from '@/components/SymbolViewMaterial';
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
            <SymbolViewMaterial
              sfName="square.grid.2x2.fill"
              materialName="dashboard"
              color={color}
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
            <SymbolViewMaterial
              sfName="person.3.fill"
              materialName="group"
              color={color}
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
            <SymbolViewMaterial
              sfName="person.2.fill"
              materialName="people"
              color={color}
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
            <SymbolViewMaterial
              sfName="bubble.left.and.bubble.right.fill"
              materialName="chat"
              color={color}
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
            <SymbolViewMaterial
              sfName="line.3.horizontal"
              materialName="menu"
              color={color}
              size={24}
            />
          ),
        }}
      />
      {/* Файловые маршруты без href попадали бы в tab bar автоматически (expo-router useScreens). href: null скрывает пункт, навигация router.push остаётся. */}
      <Tabs.Screen name="home" options={{ href: null }} />
      <Tabs.Screen name="arena" options={{ href: null }} />
      <Tabs.Screen name="teams" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="schedule" options={{ href: null }} />
    </Tabs>
  );
}
