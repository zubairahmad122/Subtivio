import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { tap } from '@/lib/haptics';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/theme-provider';

import { Text } from './text';

const buttonVariants = cva('flex-row items-center justify-center gap-2 rounded-2xl', {
  variants: {
    variant: {
      primary: 'bg-primary active:opacity-90',
      secondary: 'bg-elevated active:opacity-80',
      outline: 'border border-border bg-transparent active:bg-elevated',
      ghost: 'bg-transparent active:bg-elevated',
    },
    size: {
      sm: 'h-9 px-3',
      md: 'h-12 px-5',
      lg: 'h-14 px-6',
      icon: 'h-11 w-11',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

const labelVariants = cva('font-semibold', {
  variants: {
    variant: {
      primary: 'text-primary-foreground',
      secondary: 'text-foreground',
      outline: 'text-foreground',
      ghost: 'text-foreground',
    },
    size: { sm: 'text-sm', md: 'text-base', lg: 'text-base', icon: 'text-base' },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

export type ButtonProps = Omit<PressableProps, 'children'> &
  VariantProps<typeof buttonVariants> & {
    label?: string;
    icon?: LucideIcon;
    loading?: boolean;
    className?: string;
  };

export function Button({
  label,
  icon: Icon,
  loading,
  variant,
  size,
  className,
  disabled,
  onPress,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  const contentColor =
    variant === 'primary' || !variant ? colors['primary-foreground'] : colors.foreground;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      onPress={(e) => {
        tap();
        onPress?.(e);
      }}
      className={cn(buttonVariants({ variant, size }), isDisabled && 'opacity-50', className)}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        Icon && <Icon size={size === 'sm' ? 16 : 20} color={contentColor} strokeWidth={2.25} />
      )}
      {label ? <Text className={labelVariants({ variant, size })}>{label}</Text> : null}
    </Pressable>
  );
}
