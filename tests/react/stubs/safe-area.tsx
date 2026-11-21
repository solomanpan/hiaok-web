import type { ReactNode } from 'react';
import { View } from 'react-native';

/** Native insets do not exist in jsdom: plain views stand in. */
export const SafeAreaProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
export const SafeAreaView = (props: React.ComponentProps<typeof View>) => <View {...props} />;
