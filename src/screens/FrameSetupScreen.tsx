import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, BLEDevice, SetupStatus } from '../types';
import { colors, spacing, borderRadius, shadows } from '../constants';
import { bleService, isBLEAvailable } from '../services/bleServiceProxy';
import { generateEncryptionKey } from '../utils/encryption';

type Props = NativeStackScreenProps<RootStackParamList, 'FrameSetup'>;

type SetupStep = 'wifi_input' | 'ble_scan' | 'configuring' | 'complete';

export default function FrameSetupScreen({ navigation }: Props) {
  const [step, setStep] = useState<SetupStep>('wifi_input');
  const [wifiSSID, setWifiSSID] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [encryptionKey, setEncryptionKey] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<BLEDevice[]>([]);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatus>('idle');
  const [connectedDevice, setConnectedDevice] = useState<any>(null);
  const [macAddress, setMacAddress] = useState('');

  useEffect(() => {
    // Check Bluetooth on mount
    checkBluetooth();

    return () => {
      // Cleanup
      if (connectedDevice) {
        bleService.disconnect(connectedDevice);
      }
      bleService.stopScan();
    };
  }, []);

  const checkBluetooth = async () => {
    const isEnabled = await bleService.isBluetoothEnabled();
    if (!isEnabled) {
      Alert.alert(
        'Bluetooth Required',
        'Please enable Bluetooth to pair your frame',
        [{ text: 'OK' }]
      );
    }
  };

  const handleStartSetup = async () => {
    if (!wifiSSID.trim() || !wifiPassword.trim()) {
      Alert.alert('Error', 'Please enter WiFi SSID and password');
      return;
    }

    // Generate encryption key
    const key = await generateEncryptionKey();
    setEncryptionKey(key);

    // Start BLE scan
    setStep('ble_scan');
    startBLEScan();
  };

  const startBLEScan = async () => {
    setIsScanning(true);
    setDiscoveredDevices([]);

    try {
      await bleService.scanForFrames((device) => {
        setDiscoveredDevices(prev => {
          // Avoid duplicates
          if (prev.some(d => d.id === device.id)) {
            return prev;
          }
          return [...prev, device];
        });
      }, 15000); // Scan for 15 seconds
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Error', 'Failed to scan for frames. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectDevice = async (device: BLEDevice) => {
    setStep('configuring');
    setIsConfiguring(true);
    setSetupStatus('connecting');

    try {
      // Connect to device
      const connectedDev = await bleService.connectToFrame(device.id);
      setConnectedDevice(connectedDev);

      // Get MAC address
      const mac = await bleService.getMACAddress(connectedDev);
      setMacAddress(mac);

      // Monitor status updates
      bleService.monitorStatus(connectedDev, (status) => {
        setSetupStatus(status);
      });

      setSetupStatus('ssid_received');

      // Send configuration
      await bleService.configureFrame(
        connectedDev,
        wifiSSID,
        wifiPassword,
        encryptionKey
      );

      // Wait for WiFi connection
      await bleService.waitForStatus(
        connectedDev,
        'wifi_connected',
        30000,
        (status) => {
          setSetupStatus(status);
        }
      );

      // Success! Disconnect and move to naming screen
      await bleService.disconnect(connectedDev);
      setConnectedDevice(null);

      // Navigate to naming screen with MAC address and encryption key
      navigation.replace('NameFrame', {
        macAddress: mac,
        encryptionKey: encryptionKey,
      });
    } catch (error: any) {
      console.error('Setup error:', error);
      setIsConfiguring(false);
      
      if (connectedDevice) {
        await bleService.disconnect(connectedDevice);
        setConnectedDevice(null);
      }

      Alert.alert(
        'Setup Failed',
        error.message || 'Failed to configure frame. Please try again.',
        [
          {
            text: 'Retry',
            onPress: () => {
              setStep('ble_scan');
              startBLEScan();
            },
          },
          {
            text: 'Change WiFi',
            onPress: () => {
              setStep('wifi_input');
            },
          },
        ]
      );
    }
  };

  const getStatusMessage = (status: SetupStatus): string => {
    switch (status) {
      case 'connecting':
        return 'Connecting to frame...';
      case 'ssid_received':
        return 'Sending WiFi credentials...';
      case 'password_received':
        return 'WiFi password sent...';
      case 'key_received':
        return 'Sending encryption key...';
      case 'credentials_saved':
        return 'Configuration saved...';
      case 'connecting_wifi':
        return 'Frame connecting to WiFi...';
      case 'wifi_connected':
        return '✓ Setup complete!';
      case 'wifi_failed':
        return '✗ WiFi connection failed';
      case 'error':
        return '✗ Setup error';
      default:
        return 'Configuring...';
    }
  };

  const renderWifiInput = () => (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {!isBLEAvailable && (
        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerText}>
            🧪 Demo Mode - Using Simulated BLE
          </Text>
        </View>
      )}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Frame Setup</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>WiFi Configuration</Text>
        <Text style={styles.subtitle}>
          Enter your WiFi network details to connect your frame
        </Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>WiFi Network (SSID)</Text>
            <TextInput
              style={[
                styles.input,
                focusedInput === 'ssid' && styles.inputFocused,
              ]}
              placeholder="Enter WiFi name"
              placeholderTextColor={colors.gray[400]}
              value={wifiSSID}
              onChangeText={setWifiSSID}
              autoCapitalize="none"
              onFocus={() => setFocusedInput('ssid')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>WiFi Password</Text>
            <TextInput
              style={[
                styles.input,
                focusedInput === 'password' && styles.inputFocused,
              ]}
              placeholder="Enter WiFi password"
              placeholderTextColor={colors.gray[400]}
              value={wifiPassword}
              onChangeText={setWifiPassword}
              secureTextEntry
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ℹ️ Make sure your frame is powered on and in setup mode (LED should be blinking)
            </Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleStartSetup}>
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderBLEScan = () => (
    <View style={styles.container}>
      {!isBLEAvailable && (
        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerText}>
            🧪 Demo Mode - Using Simulated BLE
          </Text>
        </View>
      )}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep('wifi_input')}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan for Frames</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Looking for Frames</Text>
        <Text style={styles.subtitle}>
          Make sure Bluetooth is enabled and your frame is nearby
        </Text>

        {isScanning ? (
          <View style={styles.scanningContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.scanningText}>Searching for frames...</Text>
          </View>
        ) : discoveredDevices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No frames found</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={startBLEScan}
            >
              <Text style={styles.buttonText}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.deviceList}>
            <Text style={styles.deviceListTitle}>
              Found {discoveredDevices.length} frame{discoveredDevices.length !== 1 ? 's' : ''}
            </Text>
            <FlatList
              data={discoveredDevices}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.deviceItem}
                  onPress={() => handleSelectDevice(item)}
                >
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{item.name}</Text>
                    <Text style={styles.deviceId}>ID: {item.id.substring(0, 17)}...</Text>
                  </View>
                  <View style={styles.signalStrength}>
                    <Text style={styles.signalText}>
                      {item.rssi > -60 ? '●●●' : item.rssi > -80 ? '●●○' : '●○○'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>
    </View>
  );

  const renderConfiguring = () => (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.configuringContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.configuringTitle}>Configuring Frame</Text>
          <Text style={styles.configuringStatus}>
            {getStatusMessage(setupStatus)}
          </Text>

          <View style={styles.statusList}>
            <StatusItem
              label="Connecting"
              completed={['ssid_received', 'password_received', 'key_received', 'credentials_saved', 'connecting_wifi', 'wifi_connected'].includes(setupStatus)}
            />
            <StatusItem
              label="Sending credentials"
              completed={['key_received', 'credentials_saved', 'connecting_wifi', 'wifi_connected'].includes(setupStatus)}
            />
            <StatusItem
              label="WiFi connection"
              completed={setupStatus === 'wifi_connected'}
            />
          </View>
        </View>
      </View>
    </View>
  );

  if (step === 'wifi_input') return renderWifiInput();
  if (step === 'ble_scan') return renderBLEScan();
  if (step === 'configuring') return renderConfiguring();

  return null;
}

interface StatusItemProps {
  label: string;
  completed: boolean;
}

const StatusItem: React.FC<StatusItemProps> = ({ label, completed }) => (
  <View style={styles.statusItem}>
    <View style={[styles.statusDot, completed && styles.statusDotCompleted]} />
    <Text style={styles.statusLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    flexGrow: 1,
  },
  demoBanner: {
    backgroundColor: '#FFA500',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  demoBannerText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: colors.text.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
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
  infoBox: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
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
  scanningContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  scanningText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: spacing.lg,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    fontSize: 18,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  deviceList: {
    flex: 1,
  },
  deviceListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.gray[200],
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  deviceId: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  signalStrength: {
    marginLeft: spacing.md,
  },
  signalText: {
    fontSize: 14,
    color: colors.primary,
  },
  configuringContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  configuringTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  configuringStatus: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing.xxl,
  },
  statusList: {
    width: '100%',
    maxWidth: 300,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.gray[300],
    marginRight: spacing.md,
  },
  statusDotCompleted: {
    backgroundColor: colors.success,
  },
  statusLabel: {
    fontSize: 16,
    color: colors.text.primary,
  },
});

