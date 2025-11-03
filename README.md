# NovoFrame App

Eine moderne React Native App entwickelt mit Expo und TypeScript, die für App Store und Play Store Deployment vorbereitet ist.

## 🚀 Projekt-Setup

Dieses Projekt wurde mit [Expo](https://expo.dev) und dem TypeScript Template erstellt.

## 📋 Voraussetzungen

- Node.js (v18 oder höher)
- npm oder yarn
- Expo Go App auf deinem Smartphone (für Entwicklung)
- Git

## 🛠️ Installation

```bash
# Dependencies installieren
npm install

# Projekt starten
npm start
```

## 📱 Verfügbare Scripts

- `npm start` - Startet den Expo Development Server
- `npm run android` - Startet die App auf Android
- `npm run ios` - Startet die App auf iOS (nur auf macOS)
- `npm run web` - Startet die App im Web Browser

## 📁 Projektstruktur

```
src/
  ├── components/      # Wiederverwendbare UI-Komponenten
  ├── screens/         # App Screens
  ├── navigation/      # Navigation Konfiguration
  ├── services/        # API Services (für Login & andere API Calls)
  ├── utils/           # Utility Funktionen
  ├── hooks/           # Custom React Hooks
  ├── types/           # TypeScript Type Definitionen
  └── constants/       # App Konstanten
```

## 🔐 Authentication

Das Login-System ist vorbereitet, wartet jedoch auf die API-Dokumentation für die vollständige Implementierung.

### Bereits implementiert:
- ✅ Secure Token Storage mit `expo-secure-store`
- ✅ Authentication Context mit React Hooks
- ✅ Login/Logout Funktionen (Service Layer)
- ✅ API Client Setup mit Axios
- ✅ Navigation zwischen Login und Home Screen

### Noch zu implementieren:
- ⏳ Login API Integration (wartet auf API-Dokumentation)
- ⏳ Token Refresh Mechanism
- ⏳ Auto-Logout bei Token Expiry

## 🏗️ Technologie-Stack

- **React Native** - Framework für mobile Apps
- **Expo SDK 54** - Neueste stabile Version
- **TypeScript** - Für Type-Safety und bessere Skalierbarkeit
- **React Navigation** - Navigation Library
- **Context API** - State Management (später erweiterbar)
- **Axios** - HTTP Client für API Calls
- **Expo Secure Store** - Sichere Speicherung von Tokens

## 📦 App Store / Play Store Vorbereitung

Die App ist bereits für Store-Deployment vorbereitet:

- **iOS Bundle Identifier**: `com.novoframe.app`
- **Android Package**: `com.novoframe.app`

Für das tatsächliche Deployment benötigst du:
- EAS Build Account (Expo Application Services)
- App Store Connect Account (iOS)
- Google Play Console Account (Android)

## 🔄 Nächste Schritte

1. API-Dokumentation bereitstellen für Login-Implementierung
2. API-Endpoints in `src/services/authService.ts` integrieren
3. Weitere Features entsprechend der Anforderungen entwickeln

## 📝 Git Repository

Dieses Projekt ist mit Git versioniert und verbunden mit:
`git@github.com:TimoEngler/01-novoframe.git`

## 🤝 Entwicklung

Für weitere Entwicklung:
1. Feature Branch erstellen
2. Änderungen implementieren
3. Commits erstellen
4. Pull Request erstellen

## 📄 Lizenz

[Lizenz hier einfügen, falls gewünscht]

