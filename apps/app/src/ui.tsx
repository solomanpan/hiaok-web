import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from 'react-native';

/** shadcn-style building blocks for React Native (NativeWind classes; the tokens live in global.css). */
export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

type Variant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
const box: Record<Variant, string> = {
  default: 'bg-primary',
  destructive: 'bg-destructive',
  outline: 'border border-input bg-card',
  secondary: 'bg-secondary',
  ghost: '',
  link: '',
};
const ink: Record<Variant, string> = {
  default: 'text-primary-foreground',
  destructive: 'text-white',
  outline: 'text-foreground',
  secondary: 'text-secondary-foreground',
  ghost: 'text-destructive',
  link: 'text-primary underline',
};

export function Button({ children, onPress, variant = 'default', size = 'default', disabled, className, tone }: {
  children: ReactNode; onPress?: () => void; variant?: Variant; size?: 'default' | 'sm'; disabled?: boolean; className?: string;
  /** ghost buttons are neutral unless told otherwise */
  tone?: 'neutral';
}) {
  const small = size === 'sm';
  const text = variant === 'ghost' && tone === 'neutral' ? 'text-foreground' : ink[variant];
  return (
    <Pressable
      accessibilityRole="button" disabled={disabled} onPress={onPress}
      className={cn('items-center justify-center rounded-md active:opacity-80', variant === 'link' ? '' : small ? 'h-8 px-3' : 'h-10 px-4', box[variant], disabled && 'opacity-50', className)}
    >
      {typeof children === 'string' ? <Text className={cn('font-medium', small ? 'text-xs' : 'text-sm', text)}>{children}</Text> : children}
    </Pressable>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text className="text-sm font-medium text-foreground">{children}</Text>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <View className="gap-1.5"><Label>{label}</Label>{children}</View>;
}

export function Input({ className, ...props }: TextInputProps & { className?: string }) {
  return (
    <TextInput
      placeholderTextColor="#8b92a1" autoCapitalize="none" autoCorrect={false}
      className={cn('h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground', className)} {...props}
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={cn('rounded-lg border border-border bg-card p-4', className)}>{children}</View>;
}

export function Alert({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'destructive' | 'success' }) {
  const box = variant === 'destructive' ? 'border-destructive/40 bg-destructive/10' : variant === 'success' ? 'border-success/40 bg-success/10' : 'border-border bg-muted';
  const ink = variant === 'destructive' ? 'text-destructive' : variant === 'success' ? 'text-success' : 'text-foreground';
  return <View accessibilityRole="alert" className={cn('rounded-lg border px-4 py-3', box)}><Text className={cn('text-sm', ink)}>{children}</Text></View>;
}

export function Badge({ children, variant = 'success' }: { children: ReactNode; variant?: 'success' | 'destructive' }) {
  const ok = variant === 'success';
  return (
    <View className={cn('self-start rounded-full px-2.5 py-0.5', ok ? 'bg-success/15' : 'bg-destructive/15')}>
      <Text className={cn('text-xs font-semibold', ok ? 'text-success' : 'text-destructive')}>{children}</Text>
    </View>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onChange(!checked)} className="flex-row items-center gap-2 py-1">
      <View className={cn('size-5 items-center justify-center rounded border border-input', checked && 'border-primary bg-primary')}>
        {checked && <Text className="text-xs font-bold text-primary-foreground">✓</Text>}
      </View>
      {label ? <Text className="flex-1 text-sm text-foreground">{label}</Text> : null}
    </Pressable>
  );
}

/** Centered dialog; the body scrolls, the footer stays put. */
export function Dialog({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 p-4">
        <View className="max-h-[85%] w-full max-w-lg rounded-lg border border-border bg-card">
          <Text className="px-5 pt-5 text-lg font-semibold text-foreground">{title}</Text>
          <ScrollView className="px-5 py-3" keyboardShouldPersistTaps="handled"><View className="gap-4 pb-2">{children}</View></ScrollView>
          {footer ? <View className="flex-row flex-wrap justify-end gap-2 border-t border-border px-5 py-3">{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

export interface Choice { value: string; label: string }

/** A button that opens a list to pick from (there is no native <select>). */
export function Select({ value, options, onChange, placeholder }: { value: string; options: Choice[]; onChange: (v: string) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <>
      <Pressable accessibilityRole="combobox" onPress={() => setOpen(true)} className="h-10 flex-1 flex-row items-center justify-between rounded-md border border-input bg-card px-3">
        <Text numberOfLines={1} className={cn('flex-1 text-sm', current ? 'text-foreground' : 'text-muted-foreground')}>{current?.label ?? placeholder}</Text>
        <Text className="text-xs text-muted-foreground">▾</Text>
      </Pressable>
      {open && (
        <Dialog title={placeholder} onClose={() => setOpen(false)}>
          <View className="-mx-2">
            {options.map((o) => (
              <Pressable key={o.value} onPress={() => { onChange(o.value); setOpen(false); }}
                className={cn('rounded-md px-3 py-2.5 active:bg-accent', o.value === value && 'bg-accent')}>
                <Text className="text-sm text-foreground">{o.label}</Text>
              </Pressable>
            ))}
          </View>
        </Dialog>
      )}
    </>
  );
}
