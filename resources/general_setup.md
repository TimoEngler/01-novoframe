# NovoFrame Complete Setup Flow

## Übersicht

Dieser Guide beschreibt den **kompletten Ablauf** vom Auspacken des Frames bis zum ersten Bild.

## Actors

- **User**: Der Endnutzer
- **Mobile App**: iOS/Android App
- **ESP32**: Der Bilderrahmen (Hardware)
- **Server**: Backend API (api.novoframe.de)

---

## Phase 1: Initiales Setup (Erstmalige Einrichtung)

### 1. Frame auspacken & einschalten

**User:**
1. Frame aus Verpackung nehmen
2. Stromkabel anschließen
3. Frame einschalten

**ESP32:**
1. Bootet
2. Prüft Preferences → Keine WiFi-Config vorhanden
3. Startet BLE Advertising
4. Display zeigt: "Setup-Modus - Öffne die App"
5. LED blinkt blau (signalisiert Setup-Modus)

### 2. App öffnen & Account erstellen

**User:**
1. App herunterladen (iOS/Android)
2. App öffnen
3. Account erstellen:
   - Username eingeben
   - Email eingeben
   - Passwort festlegen
4. Bestätigungsmail (optional)
5. Login

**Mobile App:**
1. Sendet Registration-Request an Server
2. Erhält JWT Access Token
3. Speichert Token lokal

**Server:**
1. Erstellt User in DB
2. Hasht Passwort (bcrypt)
3. Gibt JWT Token zurück

### 3. Frame hinzufügen

**User:**
1. Klickt auf "Frame hinzufügen"
2. App fragt nach WiFi-Daten:
   - Wählt WiFi-Netzwerk aus Liste
   - Gibt WiFi-Passwort ein
3. Klickt "Weiter"

**Mobile App:**
1. Generiert 256-Bit AES Encryption Key
2. Speichert Key sicher (Keychain/EncryptedSharedPreferences)
3. Startet BLE-Scan nach "NovoFrame-Setup"

### 4. BLE-Verbindung & Konfiguration

**User:**
1. App zeigt Liste gefundener Frames
2. User wählt seinen Frame aus (z.B. nach Seriennummer)

**Mobile App:**
1. Verbindet sich mit ESP32 via BLE
2. Subscribed zu Status-Characteristic
3. Sendet in Reihenfolge:
   - WiFi SSID → SSID-Characteristic
   - WiFi Password → Password-Characteristic
   - Encryption Key → EncKey-Characteristic

**ESP32:**
1. Empfängt SSID → sendet Status "ssid_received"
2. Empfängt Password → sendet Status "password_received"
3. Empfängt Enc-Key → sendet Status "key_received"
4. Speichert alle Daten in Preferences
5. Sendet Status "credentials_saved"
6. Versucht WiFi-Verbindung
7. WiFi erfolgreich? 
   - ✅ JA: Sendet Status "wifi_connected"
   - ❌ NEIN: Sendet Status "wifi_failed" → ABBRUCH

**Mobile App:**
1. Zeigt Status-Updates in UI an
2. Wartet auf "wifi_connected" (max 30 Sekunden)
3. Liest MAC-Adresse aus BLE Device Info
4. Beendet BLE-Verbindung

### 5. Server-Registrierung (ESP32)

**ESP32:**
1. WiFi verbunden → holt eigene MAC-Adresse
2. Sendet POST zu `/api/frame/register`:
   ```json
   {
     "mac_address": "AA:BB:CC:DD:EE:FF"
   }
   ```

**Server:**
1. Prüft: MAC bereits registriert?
   - JA: Gibt existierenden API-Key zurück
   - NEIN: Erstellt neuen Frame-Eintrag
2. Generiert API-Key (falls neu)
3. Speichert in DB:
   - mac_address
   - api_key
   - paired = false
   - created_at
4. Antwortet mit API-Key

**ESP32:**
1. Empfängt API-Key
2. Speichert API-Key in Preferences
3. Display zeigt: MAC-Adresse + "Bereit zum Pairing"

### 6. Frame Pairing (User → Server)

**Mobile App:**
1. Zeigt Dialog: "Frame benennen"
2. User gibt Namen ein (z.B. "Wohnzimmer")
3. Sendet POST zu `/api/frames/pair`:
   ```json
   {
     "mac_address": "AA:BB:CC:DD:EE:FF",
     "name": "Wohnzimmer"
   }
   ```
   Header: `Authorization: Bearer <JWT>`

**Server:**
1. Prüft JWT → holt User ID
2. Sucht Frame mit MAC-Adresse
3. Frame gefunden?
   - NEIN → 404 Error
   - JA → Weiter
4. Frame bereits gepairt?
   - JA → 400 Error
   - NEIN → Weiter
5. Updated Frame:
   - user_id = current_user.id
   - paired = true
   - paired_at = now()
   - name = "Wohnzimmer"
6. Antwortet mit Frame-Daten

**Mobile App:**
1. Empfängt Success
2. Speichert Frame lokal:
   - MAC-Adresse
   - Name
   - Encryption Key (bereits gespeichert)
3. Zeigt Success-Screen: "✓ Frame erfolgreich hinzugefügt!"

### 7. Erstes Bild hochladen

**User:**
1. Klickt "Erstes Bild hochladen"
2. Wählt Bild aus Galerie

**Mobile App:**
1. Lädt Bild (max 16MB)
2. Konvertiert zu Base64
3. Lädt Encryption Key für diesen Frame
4. Verschlüsselt Base64 mit AES-256:
   ```javascript
   encrypted = AES.encrypt(base64Image, encryptionKey)
   ```
5. Erstellt Blob aus encrypted string
6. Sendet POST zu `/api/frames/AA:BB:CC:DD:EE:FF/image`:
   - Content-Type: multipart/form-data
   - Body: encrypted blob als 'file'
   - Header: `Authorization: Bearer <JWT>`

**Server:**
1. Prüft JWT → holt User ID
2. Prüft: Frame gehört User?
   - NEIN → 404 Error
   - JA → Weiter
3. Erstellt Ordner: `images/AA:BB:CC:DD:EE:FF/`
4. Speichert Datei: `current.jpg` (verschlüsselt!)
5. Erstellt DB-Eintrag in `images` Tabelle:
   - frame_id
   - filename = "current.jpg"
   - uploaded_at = now()
6. Antwortet: 200 OK

**Mobile App:**
1. Zeigt Success: "✓ Bild hochgeladen!"
2. Info: "Dein Frame zeigt das Bild in Kürze an"

### 8. Frame lädt Bild herunter

**ESP32:**
1. Sendet GET zu `/api/frame/status`:
   - Header: `X-API-Key: <api_key>`

**Server:**
1. Prüft API-Key → findet Frame
2. Prüft: Bild vorhanden?
3. Antwortet:
   ```json
   {
     "mac_address": "AA:BB:CC:DD:EE:FF",
     "name": "Wohnzimmer",
     "paired": true,
     "has_image": true,
     "last_image_upload": "2025-11-21T10:30:00.000Z"
   }
   ```

**ESP32:**
1. Sieht: `has_image = true`
2. Sendet GET zu `/api/frame/image`:
   - Header: `X-API-Key: <api_key>`

**Server:**
1. Prüft API-Key
2. Prüft: paired = true?
   - NEIN → 403 Forbidden
   - JA → Weiter
3. Sendet Datei: `images/AA:BB:CC:DD:EE:FF/current.jpg`
   - Content-Type: application/octet-stream
   - Body: verschlüsselte Daten

**ESP32:**
1. Empfängt verschlüsselte Daten
2. Speichert temporär in SPIFFS
3. Lädt Encryption Key aus Preferences
4. Entschlüsselt Daten:
   ```cpp
   decrypted = AES.decrypt(encrypted, encryptionKey)
   ```
5. Konvertiert Base64 zu Binär
6. Verarbeitet Bild für E-Paper Display
7. Zeigt Bild an!
8. Display refresh complete
9. Geht in Deep-Sleep (60 Minuten)

**User:**
- Sieht Bild auf dem Frame 🎉

---

## Phase 2: Normaler Betrieb

### Bild wechseln

**User:**
1. Öffnet App
2. Wählt Frame aus
3. Klickt "Neues Bild hochladen"
4. Wählt Bild aus

**Ablauf:**
- Gleich wie "Erstes Bild hochladen" (siehe oben)
- Server überschreibt `current.jpg`

**ESP32:**
- Wacht auf aus Deep-Sleep (jede Stunde)
- Prüft Status: Neues Bild?
- Vergleicht `last_image_upload` mit lokalem Zeitstempel
- Falls neu: Download + Display Update

### Frame umbenennen

**User:**
1. Öffnet Frame-Details in App
2. Klickt auf Namen
3. Gibt neuen Namen ein
4. Speichert

**Mobile App:**
- Sendet PUT zu `/api/frames/AA:BB:CC:DD:EE:FF`:
  ```json
  {
    "name": "Schlafzimmer"
  }
  ```

**Server:**
- Updated Frame-Name in DB

### Frame löschen

**User:**
1. Öffnet Frame-Details
2. Klickt "Frame löschen"
3. Bestätigt

**Mobile App:**
1. Sendet DELETE zu `/api/frames/AA:BB:CC:DD:EE:FF`
2. Löscht lokalen Encryption Key
3. Entfernt Frame aus Liste

**Server:**
1. Löscht Frame aus DB (CASCADE löscht auch Image-Einträge)
2. Löscht Ordner `images/AA:BB:CC:DD:EE:FF/`

**ESP32:**
- Bleibt konfiguriert (WiFi + Keys in Preferences)
- Nächster Status-Check: Frame nicht mehr gepairt
- Display zeigt: "Frame wurde entfernt - Bitte neu einrichten"

---

## Phase 3: Erneutes Setup (WiFi wechseln, etc.)

### Frame zurücksetzen

**User:**
1. Drückt Reset-Button am Frame für 5 Sekunden

**ESP32:**
1. Button-Interrupt erkannt
2. Löscht alle Preferences
3. Restartet
4. Startet im Setup-Modus (siehe Phase 1)

**Dann:**
- Gleicher Ablauf wie Phase 1
- MAC-Adresse bleibt gleich
- Server gibt alten API-Key zurück (Re-registration)
- Neuer Encryption Key wird generiert (!)

⚠️ **Wichtig:** Alter Encryption Key funktioniert nicht mehr! Alle alten Bilder müssen neu hochgeladen werden.

---

## Sequenzdiagramm

```
User          Mobile App       ESP32          Server
 |                |              |              |
 |-- Power On --->|              |              |
 |                |              |-- Boot       |
 |                |              |-- Start BLE  |
 |                |              |              |
 |-- Open App --->|              |              |
 |-- Register --->|-- POST /auth/register ----->|
 |                |<----------- JWT Token ------|
 |                |              |              |
 |-- Add Frame -->|              |              |
 |-- WiFi Data -->|              |              |
 |                |-- Gen Key    |              |
 |                |-- BLE Scan ->|              |
 |                |<-- Found ----|              |
 |                |              |              |
 |-- Select ----->|-- Connect -->|              |
 |                |-- Send SSID->|              |
 |                |-- Send Pass->|              |
 |                |-- Send Key-->|              |
 |                |              |-- Save       |
 |                |              |-- WiFi Con   |
 |                |<-- Status ---|              |
 |                |              |              |
 |                |              |-- POST /frame/register -->|
 |                |              |<------- API Key ---------|
 |                |              |              |
 |                |-- GET MAC ---|              |
 |-- Name Frame ->|              |              |
 |                |-- POST /frames/pair ------->|
 |                |<------- Success ------------|
 |                |              |              |
 |-- Upload Img ->|              |              |
 |                |-- Encrypt    |              |
 |                |-- POST /frames/X/image ---->|
 |                |<------- 200 OK -------------|
 |                |              |              |
 |                |              |-- GET /frame/status ---->|
 |                |              |<-- has_image: true ------|
 |                |              |-- GET /frame/image ----->|
 |                |              |<-- Encrypted Data -------|
 |                |              |-- Decrypt    |
 |                |              |-- Display    |
 |<- See Image ---|              |              |
```

---

## Datenfluss: Wer kennt was?

### Encryption Key

| Actor | Kennt Key? | Zweck |
|-------|-----------|-------|
| Mobile App | ✅ JA | Generiert, speichert, verschlüsselt Bilder |
| ESP32 | ✅ JA | Empfängt via BLE, entschlüsselt Bilder |
| Server | ❌ NEIN | Speichert nur verschlüsselte Daten |

### API Key

| Actor | Kennt Key? | Zweck |
|-------|-----------|-------|
| Mobile App | ❌ NEIN | Braucht nur JWT Token |
| ESP32 | ✅ JA | Authentifizierung bei Server |
| Server | ✅ JA | Generiert, validiert |

### JWT Token

| Actor | Kennt Token? | Zweck |
|-------|-------------|-------|
| Mobile App | ✅ JA | User-Authentifizierung |
| ESP32 | ❌ NEIN | Nutzt API Key statt JWT |
| Server | ✅ JA | Generiert, validiert |

---

## Fehlerbehandlung

### WiFi-Verbindung schlägt fehl

**ESP32:**
- Sendet Status "wifi_failed"
- Bleibt im BLE-Modus
- Wartet auf neue Credentials

**Mobile App:**
- Zeigt Fehler: "WiFi-Verbindung fehlgeschlagen"
- Button: "Erneut versuchen" → Sendet Daten erneut
- Button: "Andere WiFi-Daten" → Zurück zur Eingabe

### Frame bereits gepairt

**Server:**
- Gibt 400 Error: "Frame already paired"

**Mobile App:**
- Zeigt: "Dieser Frame ist bereits verbunden"
- Info: "Setze den Frame zurück (Reset-Button)"

### Bild-Upload fehlgeschlagen

**Server:**
- Gibt 500 Error

**Mobile App:**
- Zeigt: "Upload fehlgeschlagen"
- Button: "Erneut versuchen"

### Frame kann nicht erreicht werden (Offline)

**ESP32:**
- Kein Internet / Server down

**Verhalten:**
- Zeigt letztes Bild weiter an
- Versucht regelmäßig Reconnect
- Display zeigt: "Offline - Versuche erneut..."

---

## Sicherheitsaspekte

### End-to-End Verschlüsselung

✅ **Server kann Bilder NICHT sehen**
- Bilder werden in der App verschlüsselt
- Server speichert nur verschlüsselte Blobs
- Entschlüsselung nur auf ESP32

### API-Key Sicherheit

✅ **API-Key nicht kompromittiert bei App-Zugriff**
- App nutzt JWT (User-Level)
- ESP32 nutzt API-Key (Frame-Level)
- Getrennte Authentifizierung

### BLE-Sicherheit

⚠️ **BLE ist lokal und temporär**
- WiFi-Credentials nur während Setup übertragen
- Nach WiFi-Connect wird BLE deaktiviert
- Reichweite: max 10 Meter

### Pairing-Sicherheit

✅ **Zwei-Schritt-Prozess**
- Frame muss sich selbst registrieren (hat MAC + Internet)
- User muss Frame explizit pairen (hat Account)
- Unpaired Frames bekommen keine Bilder (403)

---

## Performance & Akku

### ESP32 Deep-Sleep

- **Normaler Betrieb:** Deep-Sleep 60 Minuten
- **Aufwachen:** Prüfe Status → Neues Bild? → Download → Display → Sleep
- **Stromverbrauch:**
  - Deep-Sleep: ~10-20 μA
  - Aktiv (Download): ~100-200 mA
  - Display Refresh: ~30 mA
- **Akku-Laufzeit:** Mehrere Wochen (mit Batterie)

### Server-Last

- **Status-Checks:** 1x pro Stunde pro Frame → minimal
- **Image-Downloads:** Nur bei neuem Bild → selten
- **API-Calls:** JWT-geschützt, Rate-Limited

---

## Zusammenfassung

**Setup dauert:**
- Erstmalige Einrichtung: ~5 Minuten
- Bild hochladen: ~10 Sekunden
- Frame zeigt Bild: ~2 Minuten (inkl. Wake-up aus Sleep)

**Was macht den Unterschied:**
- ✅ End-to-End Verschlüsselung
- ✅ BLE für einfaches Setup
- ✅ Two-Step Provisioning für Sicherheit
- ✅ Keine manuelle Key-Eingabe
- ✅ Alles über App steuerbar

