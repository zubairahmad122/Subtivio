import { cva, type VariantProps } from 'class-variance-authority';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from '@/lib/cn';

const textVariants = cva('text-foreground', {
  variants: {
    variant: {
      display: 'font-display text-4xl tracking-tight',
      title: 'font-bold text-2xl tracking-tight',
      heading: 'font-semibold text-lg',
      body: 'font-sans text-base leading-6',
      label: 'font-medium text-sm',
      caption: 'font-sans text-xs text-muted',
      overline: 'font-semibold text-[11px] uppercase tracking-[1.5px] text-muted',
    },
  },
  defaultVariants: { variant: 'body' },
});

export type TextProps = RNTextProps & VariantProps<typeof textVariants>;

export function Text({ className, variant, ...props }: TextProps) {
  return <RNText className={cn(textVariants({ variant }), className)} {...props} />;
}
