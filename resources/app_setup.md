# Mobile App Setup Guide - NovoFrame

## Übersicht

Die Mobile App ist verantwortlich für:
1. **Encryption Key Generierung** - Sicherer 256-Bit Key
2. **BLE-Setup des ESP32** - WiFi-Credentials + Key übertragen
3. **Frame Pairing** - Frame mit User-Account verbinden
4. **Bildverschlüsselung** - Bilder vor Upload verschlüsseln

## Wichtig: End-to-End Verschlüsselung

- **App generiert** den Encryption Key
- **App speichert** den Key lokal (sicher!)
- **Server kennt** den Key NIEMALS
- **ESP32 empfängt** den Key via BLE (einmalig)

## 1. Encryption Key Generierung

### Anforderungen

- **256-Bit AES Key** (32 Bytes)
- Kryptographisch sicher generiert
- Als Hex-String übertragen (64 Zeichen)

### Implementierung (JavaScript/React Native)

```javascript
import CryptoJS from 'crypto-js';

function generateEncryptionKey() {
  // Generate 32 random bytes (256 bits)
  const key = CryptoJS.lib.WordArray.random(32);
  
  // Convert to hex string (64 characters)
  const hexKey = key.toString(CryptoJS.enc.Hex);
  
  return hexKey;
}

// Beispiel Output: "a3f2d8e1b4c7f9e2d5a8b1c4e7f0a3d6b9c2e5f8a1d4b7c0e3f6a9d2e5f8b1c4"
```

### Implementierung (Flutter/Dart)

```dart
import 'dart:math';
import 'dart:convert';
import 'package:crypto/crypto.dart';

String generateEncryptionKey() {
  final random = Random.secure();
  final bytes = List<int>.generate(32, (i) => random.nextInt(256));
  
  // Convert to hex string
  return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
}

// Beispiel Output: "a3f2d8e1b4c7f9e2d5a8b1c4e7f0a3d6b9c2e5f8a1d4b7c0e3f6a9d2e5f8b1c4"
```

### Key-Speicherung in der App

#### iOS (Keychain)

```swift
import Security

func saveEncryptionKey(frameMAC: String, key: String) {
    let keychainQuery: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: "frame_\(frameMAC)_key",
        kSecValueData as String: key.data(using: .utf8)!,
        kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    ]
    
    SecItemDelete(keychainQuery as CFDictionary)
    SecItemAdd(keychainQuery as CFDictionary, nil)
}

func getEncryptionKey(frameMAC: String) -> String? {
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: "frame_\(frameMAC)_key",
        kSecReturnData as String: true
    ]
    
    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    
    if status == errSecSuccess, let data = result as? Data {
        return String(data: data, encoding: .utf8)
    }
    
    return nil
}
```

#### Android (EncryptedSharedPreferences)

```kotlin
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

fun saveEncryptionKey(context: Context, frameMAC: String, key: String) {
    val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    val sharedPreferences = EncryptedSharedPreferences.create(
        context,
        "novoframe_keys",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    
    sharedPreferences.edit()
        .putString("frame_${frameMAC}_key", key)
        .apply()
}

fun getEncryptionKey(context: Context, frameMAC: String): String? {
    val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    val sharedPreferences = EncryptedSharedPreferences.create(
        context,
        "novoframe_keys",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    
    return sharedPreferences.getString("frame_${frameMAC}_key", null)
}
```

## 2. BLE Connection & Setup

### Service & Characteristics

```javascript
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';

const CHARACTERISTICS = {
  SSID: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',
  PASSWORD: 'beb5483e-36e1-4688-b7f5-ea07361b26a9',
  ENCRYPTION_KEY: 'beb5483e-36e1-4688-b7f5-ea07361b26aa',
  STATUS: 'beb5483e-36e1-4688-b7f5-ea07361b26ab'
};
```

### BLE Scan & Connect (React Native BLE PLX)

```javascript
import { BleManager } from 'react-native-ble-plx';

const bleManager = new BleManager();

async function scanForFrames() {
  const devices = [];
  
  bleManager.startDeviceScan(
    [SERVICE_UUID], 
    null, 
    (error, device) => {
      if (error) {
        console.error('Scan error:', error);
        return;
      }
      
      if (device.name === 'NovoFrame-Setup') {
        devices.push({
          id: device.id,
          name: device.name,
          rssi: device.rssi
        });
      }
    }
  );
  
  // Stop scan after 10 seconds
  setTimeout(() => bleManager.stopDeviceScan(), 10000);
  
  return devices;
}

async function connectToFrame(deviceId) {
  const device = await bleManager.connectToDevice(deviceId);
  await device.discoverAllServicesAndCharacteristics();
  return device;
}
```

### BLE Scan & Connect (Flutter Blue Plus)

```dart
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

Future<List<ScanResult>> scanForFrames() async {
  final devices = <ScanResult>[];
  
  // Start scanning
  await FlutterBluePlus.startScan(
    withServices: [Guid(SERVICE_UUID)],
    timeout: Duration(seconds: 10),
  );
  
  // Listen to scan results
  FlutterBluePlus.scanResults.listen((results) {
    for (ScanResult r in results) {
      if (r.device.name == 'NovoFrame-Setup') {
        devices.add(r);
      }
    }
  });
  
  return devices;
}

Future<BluetoothDevice> connectToFrame(BluetoothDevice device) async {
  await device.connect();
  await device.discoverServices();
  return device;
}
```

### Daten an Frame senden

#### React Native

```javascript
async function configureFrame(device, wifiSSID, wifiPassword, encryptionKey) {
  try {
    // Subscribe to status updates
    device.monitorCharacteristicForService(
      SERVICE_UUID,
      CHARACTERISTICS.STATUS,
      (error, characteristic) => {
        if (characteristic) {
          const status = JSON.parse(atob(characteristic.value));
          console.log('Frame status:', status.status);
          
          // Update UI with status
          updateSetupStatus(status.status);
        }
      }
    );
    
    // Send WiFi SSID
    await device.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHARACTERISTICS.SSID,
      btoa(wifiSSID)
    );
    
    await delay(500);
    
    // Send WiFi Password
    await device.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHARACTERISTICS.PASSWORD,
      btoa(wifiPassword)
    );
    
    await delay(500);
    
    // Send Encryption Key
    await device.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHARACTERISTICS.ENCRYPTION_KEY,
      btoa(encryptionKey)
    );
    
    console.log('All data sent successfully!');
    
    // Wait for WiFi connection (max 30 seconds)
    return await waitForStatus('wifi_connected', 30000);
    
  } catch (error) {
    console.error('Configuration failed:', error);
    throw error;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForStatus(expectedStatus, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for status'));
    }, timeoutMs);
    
    // (Implement actual status listening logic here)
  });
}
```

#### Flutter

```dart
Future<void> configureFrame(
  BluetoothDevice device,
  String wifiSSID,
  String wifiPassword,
  String encryptionKey,
) async {
  final services = await device.discoverServices();
  
  BluetoothService? targetService;
  for (var service in services) {
    if (service.uuid.toString() == SERVICE_UUID) {
      targetService = service;
      break;
    }
  }
  
  if (targetService == null) {
    throw Exception('Service not found');
  }
  
  // Find characteristics
  BluetoothCharacteristic? ssidChar, passChar, keyChar, statusChar;
  
  for (var char in targetService.characteristics) {
    final uuid = char.uuid.toString();
    if (uuid == CHARACTERISTICS['SSID']) ssidChar = char;
    if (uuid == CHARACTERISTICS['PASSWORD']) passChar = char;
    if (uuid == CHARACTERISTICS['ENCRYPTION_KEY']) keyChar = char;
    if (uuid == CHARACTERISTICS['STATUS']) statusChar = char;
  }
  
  // Subscribe to status updates
  await statusChar?.setNotifyValue(true);
  statusChar?.value.listen((value) {
    final status = utf8.decode(value);
    final statusJson = jsonDecode(status);
    print('Frame status: ${statusJson['status']}');
  });
  
  // Send WiFi SSID
  await ssidChar?.write(utf8.encode(wifiSSID));
  await Future.delayed(Duration(milliseconds: 500));
  
  // Send WiFi Password
  await passChar?.write(utf8.encode(wifiPassword));
  await Future.delayed(Duration(milliseconds: 500));
  
  // Send Encryption Key
  await keyChar?.write(utf8.encode(encryptionKey));
  
  print('All data sent successfully!');
}
```

## 3. Frame Pairing mit Server

Nach erfolgreicher BLE-Konfiguration muss der Frame mit dem User-Account gepairt werden.

### API Call

```javascript
async function pairFrame(macAddress, frameName, encryptionKey) {
  const token = await getAuthToken(); // JWT Token
  
  const response = await fetch('https://api.novoframe.de/api/frames/pair', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      mac_address: macAddress,
      name: frameName
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Pairing failed');
  }
  
  const data = await response.json();
  
  // Frame erfolgreich gepairt!
  // Encryption Key lokal speichern
  await saveEncryptionKey(macAddress, encryptionKey);
  
  return data.frame;
}
```

**Wichtig:** Der Encryption Key wird **NICHT** an den Server gesendet! Nur lokal in der App speichern.

## 4. Bild hochladen & verschlüsseln

### Bildverschlüsselung

```javascript
import CryptoJS from 'crypto-js';

async function uploadEncryptedImage(macAddress, imageUri) {
  // 1. Get encryption key
  const encryptionKey = await getEncryptionKey(macAddress);
  if (!encryptionKey) {
    throw new Error('Encryption key not found for this frame');
  }
  
  // 2. Convert image to Base64
  const base64Image = await imageToBase64(imageUri);
  
  // 3. Encrypt with AES
  const encrypted = CryptoJS.AES.encrypt(base64Image, encryptionKey).toString();
  
  // 4. Upload as blob
  const blob = new Blob([encrypted], { type: 'text/plain' });
  const formData = new FormData();
  formData.append('file', blob, 'encrypted.txt');
  
  // 5. Send to server
  const token = await getAuthToken();
  const response = await fetch(
    `https://api.novoframe.de/api/frames/${macAddress}/image`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }
  );
  
  if (!response.ok) {
    throw new Error('Upload failed');
  }
  
  return await response.json();
}

async function imageToBase64(imageUri) {
  // React Native
  const response = await fetch(imageUri);
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

## 5. UI/UX Flow

### Setup-Prozess

1. **Willkommen-Screen**
   - "Neuen Frame hinzufügen"
   - Button: "Frame einrichten"

2. **WiFi-Eingabe**
   - SSID auswählen (Liste der verfügbaren Netzwerke)
   - Passwort eingeben
   - Button: "Weiter"

3. **BLE-Scan**
   - "Suche nach Frame..."
   - Liste der gefundenen Frames
   - User wählt Frame aus

4. **Setup wird durchgeführt**
   - Progress Indicator
   - Status-Updates:
     - "Verbinde mit Frame..."
     - "Sende WiFi-Daten..."
     - "Sende Verschlüsselungs-Key..."
     - "Frame verbindet sich mit WiFi..."
     - "✓ Setup abgeschlossen!"

5. **Frame benennen**
   - "Wie möchtest du deinen Frame nennen?"
   - Eingabefeld (z.B. "Wohnzimmer")
   - Button: "Frame aktivieren"

6. **Pairing mit Server**
   - Frame wird mit User-Account verbunden
   - MAC-Adresse wird angezeigt
   - "✓ Frame erfolgreich hinzugefügt!"

7. **Erstes Bild hochladen**
   - "Lade dein erstes Bild hoch"
   - Bildauswahl
   - Upload mit Verschlüsselung

### Error Handling

**WiFi-Verbindung fehlgeschlagen:**
- Fehlermeldung: "Frame konnte sich nicht mit WiFi verbinden"
- Optionen: "Erneut versuchen" / "Andere WiFi-Daten eingeben"

**BLE-Verbindung verloren:**
- Fehlermeldung: "Verbindung zum Frame verloren"
- Option: "Erneut scannen"

**Frame bereits gepairt:**
- Fehlermeldung: "Dieser Frame ist bereits mit einem anderen Account verbunden"
- Info: "Bitte setze den Frame zurück (Reset-Button 5 Sekunden drücken)"

## 6. Benötigte Libraries

### React Native
```json
{
  "react-native-ble-plx": "^2.0.3",
  "crypto-js": "^4.1.1",
  "@react-native-async-storage/async-storage": "^1.19.0"
}
```

### Flutter
```yaml
dependencies:
  flutter_blue_plus: ^1.14.0
  crypto: ^3.0.3
  flutter_secure_storage: ^9.0.0
```

## 7. Testing

### Test-Checklist

- [ ] Key-Generierung funktioniert
- [ ] Key wird sicher gespeichert
- [ ] BLE-Scan findet Frame
- [ ] BLE-Verbindung stabil
- [ ] WiFi-Credentials werden übertragen
- [ ] Encryption Key wird übertragen
- [ ] Frame verbindet sich mit WiFi
- [ ] Frame pairing mit Server
- [ ] Bildverschlüsselung funktioniert
- [ ] Upload funktioniert
- [ ] Frame zeigt Bild korrekt an

## Troubleshooting

### "BLE nicht verfügbar"
- Bluetooth-Berechtigung prüfen
- Bluetooth aktiviert?

### "Frame nicht gefunden"
- Frame ist im Setup-Modus? (LED sollte blinken)
- Zu weit entfernt? (max 10m)
- Andere Frames in der Nähe?

### "Setup schlägt fehl"
- WiFi-Passwort korrekt?
- 2.4 GHz WiFi? (5 GHz wird nicht unterstützt)
- SSID ohne Sonderzeichen?

### "Bild wird nicht angezeigt"
- Frame gepairt?
- Encryption Key korrekt gespeichert?
- Internet-Verbindung am Frame?

