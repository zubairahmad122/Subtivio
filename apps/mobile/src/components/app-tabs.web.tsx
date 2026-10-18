import {
  Tabs,
  TabList,
  TabSlot,
  TabTrigger,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { House, Settings, Type, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/theme-provider';

const TABS: {
  name: string;
  href: '/' | '/templates' | '/settings';
  label: string;
  icon: LucideIcon;
}[] = [
  { name: 'index', href: '/', label: 'Home', icon: House },
  { name: 'templates', href: '/templates', label: 'Styles', icon: Type },
  { name: 'settings', href: '/settings', label: 'Settings', icon: Settings },
];

/** Floating pill tab bar for web. */
export function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <TabBar>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon} label={tab.label} />
            </TabTrigger>
          ))}
        </TabBar>
      </TabList>
    </Tabs>
  );
}

function TabBar({ children, ...props }: TabListProps) {
  return (
    <View {...props} className="absolute bottom-5 w-full flex-row justify-center px-4">
      <View className="flex-row gap-1 rounded-full border border-border bg-surface/90 p-1.5 shadow-lg">
        {children}
      </View>
    </View>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icon: LucideIcon; label: string };

// `ref` is mistyped in expo-router's TabTriggerSlotProps (component, not instance)
// and the button doesn't need it, so it is not forwarded.
function TabButton({ icon: Icon, label, isFocused, ref: _ref, ...props }: TabButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      {...props}
      className={cn(
        'h-11 flex-row items-center gap-2 rounded-full px-4',
        isFocused ? 'bg-primary' : 'active:bg-elevated',
      )}
    >
      <Icon size={18} color={isFocused ? colors['primary-foreground'] : colors.muted} />
      <Text
        className={cn(
          'font-semibold text-sm',
          isFocused ? 'text-primary-foreground' : 'text-muted',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
