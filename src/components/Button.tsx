import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
};

export function Button({ title, onPress, disabled, color = colors.primary }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: disabled ? colors.locked : color },
        pressed && { transform: [{ translateY: 2 }], opacity: 0.9 },
      ]}
    >
      <Text style={styles.title}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  title: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
});
