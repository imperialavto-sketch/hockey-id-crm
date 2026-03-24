import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Platform, Pressable, Text, TextStyle } from 'react-native';

type ExternalLinkProps = {
  href: string;
  children: React.ReactNode;
  style?: TextStyle;
};

export function ExternalLink({ href, children, style }: ExternalLinkProps) {
  const handlePress = async () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(href, '_blank');
    } else {
      await WebBrowser.openBrowserAsync(href);
    }
  };

  return (
    <Pressable onPress={handlePress}>
      {({ pressed }) => (
        <Text style={[style, { opacity: pressed ? 0.7 : 1 }]}>{children}</Text>
      )}
    </Pressable>
  );
}
