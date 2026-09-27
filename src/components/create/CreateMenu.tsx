import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeTokens } from '@/hooks/use-theme';
import { openCreatePost, openStudio } from '@/lib/navigation';

type CreateMenuProps = {
  visible: boolean;
  onClose: () => void;
};

export function CreateMenu({ visible, onClose }: CreateMenuProps) {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();

  function openText() {
    onClose();
    openCreatePost();
  }

  function openVisual() {
    onClose();
    openStudio();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.fill} accessibilityViewIsModal>
        <Pressable
          style={styles.fill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar menu"
        />
        <View
          style={[
            styles.menu,
            {
              top: insets.top + 56,
              backgroundColor: tokens.background.surface,
              borderColor: tokens.border.subtle,
            },
          ]}
          accessibilityRole="menu"
        >
          <MenuOption
            label="Publicação em texto"
            hint="Escrever uma história"
            onPress={openText}
          />
          <View style={[styles.rule, { backgroundColor: tokens.border.subtle }]} />
          <MenuOption label="Studio" hint="Fotografia" onPress={openVisual} />
        </View>
      </View>
    </Modal>
  );
}

function MenuOption({
  label,
  hint,
  onPress,
}: {
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      <Text variant="meta">{label}</Text>
      <Text variant="caption" tone="secondary">
        {hint}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
  menu: {
    position: 'absolute',
    left: Spacing.three,
    minWidth: 220,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: 2,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.72,
  },
});
