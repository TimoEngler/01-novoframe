# ESP32 NovoFrame Setup Guide

## Übersicht

Dieser Guide erklärt Schritt-für-Schritt, wie der ESP32-Bilderrahmen mit dem NovoFrame-Server kommuniziert.

## Sicherheitskonzept: Two-Step Provisioning

Das System verwendet einen **Two-Step Provisioning Prozess**:

1. **Registration**: ESP32 registriert sich mit seiner MAC-Adresse → erhält API-Key
2. **Pairing**: User clairt den Frame in der Web-App → Frame wird aktiviert

**Warum ist das sicher?**
- Ein unpaired Frame kann **keine Bilder abrufen**, selbst mit gültigem API-Key
- Jemand mit Zugriff auf die MAC-Adresse könnte sich registrieren, aber ohne User-Pairing ist der Frame nutzlos
- Erst nach dem Pairing durch den rechtmäßigen Besitzer wird der Frame funktional

## Hardware-Identifikation

Der ESP32 verwendet seine **MAC-Adresse** als eindeutige ID:
- MAC-Adresse ist fest in Hardware eingebrannt
- Kann nicht verloren gehen (auch nicht bei Reflash)
- Format: `AA:BB:CC:DD:EE:FF` (6 Bytes, hexadezimal)

---

## 🔵 BLE Setup Flow (Produktiver Modus)

### Übersicht

In der **Produktivumgebung** wird der Frame über **Bluetooth Low Energy (BLE)** eingerichtet:

1. Mobile App generiert Encryption Key
2. User verbindet sich via BLE mit ESP32
3. App sendet WiFi-Credentials + Encryption Key über BLE
4. ESP32 speichert alles in Preferences
5. ESP32 verbindet sich mit WiFi und registriert sich beim Server

### BLE Service Definition

**Service UUID:** `4fafc201-1fb5-459e-8fcc-c5c9c331914b`

**Characteristics:**

| Characteristic | UUID | Properties | Beschreibung |
|---------------|------|------------|--------------|
| WiFi SSID | `beb5483e-36e1-4688-b7f5-ea07361b26a8` | Write | WiFi-Netzwerkname (max 32 Zeichen) |
| WiFi Password | `beb5483e-36e1-4688-b7f5-ea07361b26a9` | Write | WiFi-Passwort (max 64 Zeichen) |
| Encryption Key | `beb5483e-36e1-4688-b7f5-ea07361b26aa` | Write | AES-256 Key (32 Bytes als Hex-String = 64 Zeichen) |
| Status | `beb5483e-36e1-4688-b7f5-ea07361b26ab` | Read, Notify | Setup-Status (JSON String) |

### ESP32 BLE Server Implementation

```cpp
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Preferences.h>

// Service & Characteristic UUIDs
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_SSID_UUID      "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_PASSWORD_UUID  "beb5483e-36e1-4688-b7f5-ea07361b26a9"
#define CHAR_ENCKEY_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26aa"
#define CHAR_STATUS_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26ab"

Preferences preferences;
BLECharacteristic *pStatusCharacteristic;

String wifiSSID = "";
String wifiPassword = "";
String encryptionKey = "";
bool setupComplete = false;

// Callback für WiFi SSID
class SSIDCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    if (value.length() > 0) {
      wifiSSID = String(value.c_str());
      Serial.println("Received SSID: " + wifiSSID);
      updateStatus("ssid_received");
    }
  }
};

// Callback für WiFi Password
class PasswordCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    if (value.length() > 0) {
      wifiPassword = String(value.c_str());
      Serial.println("Received WiFi Password");
      updateStatus("password_received");
    }
  }
};

// Callback für Encryption Key
class EncKeyCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    if (value.length() > 0) {
      encryptionKey = String(value.c_str());
      Serial.println("Received Encryption Key");
      updateStatus("key_received");
      
      // Alle Daten empfangen - speichern und WiFi verbinden
      if (wifiSSID.length() > 0 && wifiPassword.length() > 0) {
        saveCredentials();
        connectToWiFi();
      }
    }
  }
};

void updateStatus(String status) {
  // Send status update via BLE notification
  String statusJSON = "{\"status\":\"" + status + "\"}";
  pStatusCharacteristic->setValue(statusJSON.c_str());
  pStatusCharacteristic->notify();
}

void saveCredentials() {
  Serial.println("Saving credentials to Preferences...");
  
  preferences.begin("novoframe", false);
  preferences.putString("wifi_ssid", wifiSSID);
  preferences.putString("wifi_pass", wifiPassword);
  preferences.putString("enc_key", encryptionKey);
  preferences.putBool("configured", true);
  preferences.end();
  
  updateStatus("credentials_saved");
  Serial.println("Credentials saved successfully!");
}

void connectToWiFi() {
  Serial.println("Connecting to WiFi: " + wifiSSID);
  updateStatus("connecting_wifi");
  
  WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    
    updateStatus("wifi_connected");
    setupComplete = true;
    
    // BLE kann jetzt deaktiviert werden
    delay(2000);
    BLEDevice::deinit(true);
    
    // Ab jetzt normal mit Server kommunizieren
    registerWithServer();
  } else {
    Serial.println("\nWiFi connection failed!");
    updateStatus("wifi_failed");
  }
}

void setupBLE() {
  Serial.println("Starting BLE setup...");
  
  // BLE Device initialisieren
  BLEDevice::init("NovoFrame-Setup");
  
  // BLE Server erstellen
  BLEServer *pServer = BLEDevice::createServer();
  
  // Service erstellen
  BLEService *pService = pServer->createService(SERVICE_UUID);
  
  // Characteristics erstellen
  BLECharacteristic *pSSIDChar = pService->createCharacteristic(
    CHAR_SSID_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pSSIDChar->setCallbacks(new SSIDCallbacks());
  
  BLECharacteristic *pPasswordChar = pService->createCharacteristic(
    CHAR_PASSWORD_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pPasswordChar->setCallbacks(new PasswordCallbacks());
  
  BLECharacteristic *pEncKeyChar = pService->createCharacteristic(
    CHAR_ENCKEY_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pEncKeyChar->setCallbacks(new EncKeyCallbacks());
  
  pStatusCharacteristic = pService->createCharacteristic(
    CHAR_STATUS_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pStatusCharacteristic->addDescriptor(new BLE2902());
  pStatusCharacteristic->setValue("{\"status\":\"ready\"}");
  
  // Service starten
  pService->start();
  
  // Advertising starten
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  
  Serial.println("BLE Advertising started - waiting for app connection...");
  updateStatus("ble_ready");
}

void setup() {
  Serial.begin(115200);
  
  preferences.begin("novoframe", false);
  bool configured = preferences.getBool("configured", false);
  
  if (configured) {
    // Bereits konfiguriert - Credentials laden
    Serial.println("Device already configured, loading credentials...");
    wifiSSID = preferences.getString("wifi_ssid", "");
    wifiPassword = preferences.getString("wifi_pass", "");
    encryptionKey = preferences.getString("enc_key", "");
    preferences.end();
    
    // Direkt WiFi verbinden
    connectToWiFi();
    
    if (WiFi.status() == WL_CONNECTED) {
      setupComplete = true;
    } else {
      // WiFi-Verbindung fehlgeschlagen - BLE Setup erneut starten
      Serial.println("WiFi failed, starting BLE setup...");
      setupBLE();
    }
  } else {
    // Nicht konfiguriert - BLE Setup starten
    Serial.println("Device not configured, starting BLE setup...");
    setupBLE();
  }
}

void loop() {
  if (setupComplete) {
    // Normaler Betrieb - Bilder abrufen etc.
    // ... (siehe andere Abschnitte)
  } else {
    // Warten auf BLE-Konfiguration
    delay(1000);
  }
}
```

### Setup-Ablauf im ESP32

1. **Boot:** ESP32 startet
2. **Check:** Preferences prüfen - bereits konfiguriert?
   - **JA:** WiFi-Credentials laden → WiFi verbinden → Normal betreiben
   - **NEIN:** BLE Setup starten
3. **BLE Advertising:** ESP32 ist als "NovoFrame-Setup" sichtbar
4. **App verbindet:** Mobile App scannt und verbindet sich
5. **Datenempfang:** 
   - SSID empfangen
   - Password empfangen
   - Encryption Key empfangen
6. **Speichern:** Alles in Preferences speichern
7. **WiFi Connect:** Mit WiFi verbinden
8. **BLE beenden:** BLE deaktivieren (spart Strom)
9. **Server Registration:** Mit Server registrieren (siehe nächster Abschnitt)

### Status-Updates via BLE

Der ESP32 sendet Status-Updates über die Status-Characteristic:

```json
{"status": "ready"}            // BLE bereit, wartet auf App
{"status": "ssid_received"}    // SSID empfangen
{"status": "password_received"} // Passwort empfangen
{"status": "key_received"}      // Encryption Key empfangen
{"status": "credentials_saved"} // Alles gespeichert
{"status": "connecting_wifi"}   // Verbinde mit WiFi...
{"status": "wifi_connected"}    // WiFi erfolgreich
{"status": "wifi_failed"}       // WiFi-Verbindung fehlgeschlagen
```

### Reset-Funktion

Um den Frame neu zu konfigurieren (z.B. neues WiFi):

```cpp
void resetConfiguration() {
  preferences.begin("novoframe", false);
  preferences.clear();
  preferences.end();
  
  Serial.println("Configuration cleared - restarting...");
  ESP.restart();
}

// Trigger via Hardware-Button:
// Bei Button-Press für 5 Sekunden → resetConfiguration();
```

---

## API-Endpunkte

Base URL: `https://api.novoframe.de`

### 1. Frame Registration

**Endpunkt:** `POST /api/frame/register`

**Wann aufrufen:** 
- Beim ersten Start des ESP32
- Bei jedem Start zur Re-registration (um API-Key zu erhalten)

**Request Body:**
```json
{
  "mac_address": "AA:BB:CC:DD:EE:FF"
}
```

**Response (Erfolg - Neu registriert):**
```json
{
  "message": "Frame registered successfully",
  "api_key": "xyz123abc456def789...",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "paired": false
}
```

**Response (Erfolg - Bereits registriert):**
```json
{
  "message": "Frame already registered",
  "api_key": "xyz123abc456def789...",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "paired": true
}
```

**Response (Fehler):**
```json
{
  "error": "mac_address is required"
}
```

**ESP32 Code Beispiel:**
```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <Preferences.h>

Preferences preferences;
String apiKey = "";
String macAddress = "";

void setup() {
  // Get MAC address
  macAddress = WiFi.macAddress();
  
  // Initialize preferences for persistent storage
  preferences.begin("novoframe", false);
  
  // Try to load saved API key
  apiKey = preferences.getString("api_key", "");
  
  if (apiKey == "") {
    // No API key saved - register with server
    registerFrame();
  } else {
    // API key exists - verify it's still valid by re-registering
    registerFrame();
  }
}

void registerFrame() {
  HTTPClient http;
  http.begin("https://api.novoframe.de/api/frame/register");
  http.addHeader("Content-Type", "application/json");
  
  String jsonPayload = "{\"mac_address\":\"" + macAddress + "\"}";
  
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode == 200 || httpResponseCode == 201) {
    String response = http.getString();
    
    // Parse JSON response to extract api_key
    // (You'll need ArduinoJson library for proper parsing)
    // Example: apiKey = parseApiKey(response);
    
    // Save API key to persistent storage
    preferences.putString("api_key", apiKey);
    
    Serial.println("Registration successful!");
    Serial.println("API Key: " + apiKey);
  } else {
    Serial.println("Registration failed: " + String(httpResponseCode));
  }
  
  http.end();
}
```

### 2. Frame Status Check

**Endpunkt:** `GET /api/frame/status`

**Header:**
```
X-API-Key: your-api-key-here
```

**Wann aufrufen:**
- Nach erfolgreicher Registration
- Regelmäßig, um zu prüfen ob Frame gepairt wurde
- Um zu prüfen ob ein neues Bild verfügbar ist

**Response:**
```json
{
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "name": "My Picture Frame",
  "paired": true,
  "has_image": true,
  "last_image_upload": "2025-11-21T10:30:00.000Z"
}
```

**ESP32 Code Beispiel:**
```cpp
bool checkFrameStatus() {
  HTTPClient http;
  http.begin("https://api.novoframe.de/api/frame/status");
  http.addHeader("X-API-Key", apiKey);
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    // Parse response to check "paired" and "has_image" status
    return true;
  } else if (httpResponseCode == 401) {
    Serial.println("API Key invalid - need to re-register");
    return false;
  }
  
  http.end();
  return false;
}
```

### 3. Download Image

**Endpunkt:** `GET /api/frame/image`

**Header:**
```
X-API-Key: your-api-key-here
```

**Wann aufrufen:**
- Nur wenn `paired = true` und `has_image = true`
- Nach Statuscheck, wenn neues Bild verfügbar

**Response:**
- Content-Type: `application/octet-stream`
- Body: Verschlüsselte Bilddaten (Binary)

**Response (Fehler - Unpaired):**
```json
{
  "error": "Frame not paired"
}
```

**Response (Fehler - Kein Bild):**
```json
{
  "error": "No image available"
}
```

**ESP32 Code Beispiel:**
```cpp
bool downloadImage() {
  HTTPClient http;
  http.begin("https://api.novoframe.de/api/frame/image");
  http.addHeader("X-API-Key", apiKey);
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode == 200) {
    // Open file on SPIFFS for writing
    File file = SPIFFS.open("/image_encrypted.bin", "w");
    
    WiFiClient* stream = http.getStreamPtr();
    
    // Stream data directly to SPIFFS
    uint8_t buffer[1024];
    int len = http.getSize();
    int totalRead = 0;
    
    while (http.connected() && (len > 0 || len == -1)) {
      size_t size = stream->available();
      
      if (size) {
        int c = stream->readBytes(buffer, ((size > sizeof(buffer)) ? sizeof(buffer) : size));
        file.write(buffer, c);
        totalRead += c;
        
        if (len > 0) {
          len -= c;
        }
      }
      delay(1);
    }
    
    file.close();
    Serial.println("Image downloaded: " + String(totalRead) + " bytes");
    
    // Now decrypt the image
    decryptImage("/image_encrypted.bin", "/image.bin");
    
    return true;
  } else if (httpResponseCode == 404) {
    Serial.println("No image available yet");
    return false;
  } else if (httpResponseCode == 403) {
    Serial.println("Frame not paired - waiting for user to pair in app");
    return false;
  }
  
  http.end();
  return false;
}
```

## Empfohlener Ablauf im ESP32

### Setup Phase:
```
1. WiFi verbinden
2. MAC-Adresse auslesen
3. Preferences initialisieren
4. API-Key aus Speicher laden (falls vorhanden)
5. Frame registrieren (erhält API-Key zurück)
6. API-Key speichern
7. Status prüfen
```

### Loop Phase:
```
1. Status prüfen (alle 30-60 Sekunden)
2. Wenn paired=false: Warten
3. Wenn paired=true und has_image=true:
   - Letzten Upload-Zeitstempel mit lokalem vergleichen
   - Falls neu: Bild herunterladen
   - Bild entschlüsseln
   - Display aktualisieren
4. Warten (z.B. 60 Sekunden)
```

## Verschlüsselung

**Wichtig:** Die Bilder werden End-to-End verschlüsselt übertragen.

Der Encryption-Key ist:
- Fest im ESP32-Code eingebaut
- Identisch mit dem Key im Frontend (Client-seitige Verschlüsselung)
- Server kann Bilder nicht entschlüsseln

**Verschlüsselungsalgorithmus:** AES-256 (Details siehe `utils/encryption.py`)

## Error Handling

### HTTP Status Codes:

- `200 OK` - Erfolg
- `201 Created` - Frame neu registriert
- `401 Unauthorized` - API-Key ungültig
- `403 Forbidden` - Frame nicht gepairt (kein Zugriff auf Bilder)
- `404 Not Found` - Kein Bild verfügbar
- `500 Internal Server Error` - Server-Fehler

### Empfohlenes Verhalten:

- **401**: Re-registration durchführen
- **403**: Warten bis User Frame pairt
- **404**: Weiter warten, User hat noch kein Bild hochgeladen
- **500**: Nach 1 Minute erneut versuchen

## User Pairing Prozess

Der User muss den Frame in der Web-App (https://app.novoframe.de) pairen:

1. User registriert sich / loggt sich ein
2. Klickt auf "Frame hinzufügen"
3. Gibt die MAC-Adresse ein (steht auf dem Gerät oder wird auf Display angezeigt)
4. Frame wird dem User-Account zugeordnet
5. Frame erhält beim nächsten Status-Check `paired=true`

**Tipp:** Zeige die MAC-Adresse auf dem E-Paper Display beim Start an, damit der User sie abtippen kann!

## Benötigte Libraries

- `WiFi.h` - WiFi-Verbindung
- `HTTPClient.h` - HTTP-Requests
- `Preferences.h` - Persistent Storage für API-Key
- `SPIFFS.h` - File System für Bilder
- `ArduinoJson.h` - JSON Parsing (empfohlen)
- `mbedtls` - AES Verschlüsselung (für Dekodierung)

## Troubleshooting

### Frame registriert sich nicht:
- WiFi-Verbindung prüfen
- Server-URL korrekt?
- JSON-Format korrekt?

### Frame bekommt kein Bild:
- Status-Check: Ist `paired=true`?
- Status-Check: Ist `has_image=true`?
- User hat Bild in Web-App hochgeladen?

### API-Key funktioniert nicht:
- Neu registrieren
- API-Key richtig gespeichert?
- Header `X-API-Key` richtig gesetzt?

## Nächste Schritte

1. MAC-Adresse auf Display anzeigen beim Start
2. Pairing-Status visualisieren (LED oder Display-Nachricht)
3. Automatische Updates alle 60 Sekunden
4. Deep-Sleep zwischen Updates (Energiesparen)

