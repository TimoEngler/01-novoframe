import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { colors, spacing, borderRadius, shadows } from '../constants';
import { frameService } from '../services/frameService';
import { saveEncryptionKey } from '../utils/encryption';

type Props = NativeStackScreenProps<RootStackParamList, 'NameFrame'>;

export default function NameFrameScreen({ navigation, route }: Props) {
  const { macAddress, encryptionKey } = route.params;
  const [frameName, setFrameName] = useState('');
  const [focusedInput, setFocusedInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleActivateFrame = async () => {
    if (!frameName.trim()) {
      Alert.alert('Error', 'Please enter a name for your frame');
      return;
    }

    setIsLoading(true);

    try {
      // Pair frame with server
      await frameService.pairFrame(macAddress, frameName.trim());

      // Save encryption key locally
      await saveEncryptionKey(macAddress, encryptionKey);

      // Show success message
      Alert.alert(
        'Success!',
        'Your frame has been successfully added',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to home
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Pairing error:', error);
      setIsLoading(false);

      let errorMessage = 'Failed to pair frame. Please try again.';
      
      if (error.message.includes('already paired')) {
        errorMessage = 'This frame is already paired with another account. Please reset the frame and try again.';
      }

      Alert.alert('Pairing Failed', errorMessage, [
        {
          text: 'Try Again',
          onPress: handleActivateFrame,
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          },
        },
      ]);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <View style={styles.successIcon}>
          <Text style={styles.successEmoji}>✓</Text>
        </View>

        <Text style={styles.title}>Setup Complete!</Text>
        <Text style={styles.subtitle}>
          Your frame is now connected to WiFi.{'\n'}
          Give it a name to finish setup.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>MAC Address</Text>
          <Text style={styles.infoValue}>{macAddress}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Frame Name</Text>
            <TextInput
              style={[
                styles.input,
                focusedInput && styles.inputFocused,
              ]}
              placeholder="e.g., Living Room"
              placeholderTextColor={colors.gray[400]}
              value={frameName}
              onChangeText={setFrameName}
              autoCapitalize="words"
              onFocus={() => setFocusedInput(true)}
              onBlur={() => setFocusedInput(false)}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleActivateFrame}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Activate Frame</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.helpBox}>
          <Text style={styles.helpText}>
            💡 You can change this name later in the frame settings
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    ...shadows.lg,
  },
  successEmoji: {
    fontSize: 50,
    color: colors.white,
    fontWeight: '700',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  infoLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '600',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  input: {
    height: 60,
    backgroundColor: colors.gray[50],
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.text.primary,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  button: {
    height: 60,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  helpBox: {
    marginTop: spacing.xl,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: '100%',
  },
  helpText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

