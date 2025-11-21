# NovoFrame App - Phase 1: Setup & Testing Guide

## 🎉 What's New

Phase 1 implementation is complete! Your NovoFrame app now includes:

- ✅ Profile management
- ✅ Frame list with navigation
- ✅ Complete BLE pairing flow
- ✅ WiFi configuration
- ✅ Encryption key generation
- ✅ Frame naming and activation

## 🚀 Quick Start

### Two Modes Available

#### 🧪 **Demo Mode (Expo Go)** - For UI Testing
Use this mode to test the UI/UX without needing a real ESP32.

```bash
npm start
```

Then scan the QR code with Expo Go app. The app will automatically detect that native BLE isn't available and use **simulated BLE** with fake devices.

**Demo Mode Features:**
- ✅ Test all screens and navigation
- ✅ Simulated BLE scanning (shows 2 fake devices)
- ✅ Simulated pairing process with status updates
- ✅ Test frame display and management
- ❌ Cannot connect to real ESP32

#### 🔧 **Real BLE Mode (Development Build)** - For ESP32 Testing
Use this mode to actually pair with your ESP32 device.

**iOS:**
```bash
npx expo run:ios
```

**Android:**
```bash
npx expo run:android
```

This creates a development build with native BLE modules included.

### 1. Start the Development Server (Both Modes)

```bash
npm start
```

This will start the Expo development server. You'll see a QR code in the terminal.

## 🎭 How to Tell Which Mode You're In

**Demo Mode (Expo Go):**
- 🧪 Orange banner at top: "Demo Mode - Using Simulated BLE"
- Console shows: `[BLE Proxy] Using MOCK BLE service`
- Scanning finds exactly 2 fake devices
- MAC address is always: `AA:BB:CC:DD:EE:FF`

**Real BLE Mode (Development Build):**
- No orange banner
- Console shows: `[BLE Proxy] Using REAL BLE service`
- Scanning finds your actual ESP32
- MAC address matches your device

## 📱 Testing the Complete Flow

### Prerequisites (Real BLE Mode Only)

- ✅ ESP32 powered on and running BLE setup code
- ✅ ESP32 LED blinking (indicates setup mode)
- ✅ ESP32 within 10 meters of your phone
- ✅ 2.4GHz WiFi network available
- ✅ Bluetooth enabled on your phone

### Prerequisites (Demo Mode)

- ✅ Just open Expo Go - that's it!

### Step-by-Step Testing

#### 1. **Login/Register**
- Open the app
- Register a new account or login
- You should see the home screen with profile icon

#### 2. **Start Frame Pairing**
- If no frames: Click "Pair Now"
- If frames exist: Click "+ Add Another Frame"

#### 3. **Enter WiFi Credentials**
- Enter your 2.4GHz WiFi SSID
- Enter WiFi password
- Click "Next"
- ⚠️ **Important**: Frame only supports 2.4GHz networks!

#### 4. **BLE Scanning**

**Demo Mode:**
- After 2 seconds, 2 fake devices appear
- Both named "NovoFrame-Setup"
- Choose either one (doesn't matter)

**Real BLE Mode:**
- App scans for 15 seconds
- Your actual ESP32 appears as "NovoFrame-Setup"
- Signal strength shown (●●● = strong, ●○○ = weak)
- Tap your frame to select it

#### 5. **Configuration**
- Watch status messages:
  - "Connecting to frame..."
  - "Sending WiFi credentials..."
  - "Sending encryption key..."
  - "Frame connecting to WiFi..."
  - "✓ Setup complete!"
- This takes ~5-10 seconds

#### 6. **Name Your Frame**
- Enter a name (e.g., "Living Room")
- Click "Activate Frame"
- Wait for API pairing to complete
- Success message appears

#### 7. **View Frame**
- You're redirected to home screen
- See your frame card with:
  - Frame name
  - Connection status
  - MAC address
  - Image placeholder

#### 8. **Test Multiple Frames**
- Click "+ Add Another Frame"
- Repeat pairing process
- Navigation arrows appear (‹ ›)
- Swipe between frames

#### 9. **Test Profile**
- Tap profile icon (top-right)
- View your info
- Test logout
- Login again

## 🔧 Troubleshooting

### "Invariant Violation: Native module doesn't exist"

**Cause:**
- You're in Expo Go and the app is trying to use real BLE

**Solution:**
- The app should auto-detect and use mock BLE
- If you see this error, try:
  1. Clear Metro bundler cache: `npm start -- --clear`
  2. Reload app in Expo Go
  3. Check console for: `[BLE Proxy] Using MOCK BLE service`

### Demo Mode Not Working

**Symptoms:**
- No orange banner
- Can't find any devices
- App crashes on scan

**Solutions:**
1. Make sure you're using `bleServiceProxy` not `bleService`
2. Check imports in `FrameSetupScreen.tsx`
3. Clear cache: `npm start -- --clear`

### Want to Switch from Demo to Real BLE?

```bash
# Stop Expo Go version
# Build development version
npx expo run:ios
# or
npx expo run:android
```

The same code automatically uses real BLE!

### "No frames found" during scan (Real BLE Mode)

**Causes:**
- ESP32 not in setup mode
- ESP32 too far away (>10m)
- Bluetooth disabled on phone

**Solutions:**
1. Check ESP32 LED is blinking
2. Move phone closer to ESP32
3. Enable Bluetooth in phone settings
4. Click "Scan Again"

### "WiFi connection failed"

**Causes:**
- Wrong WiFi password
- 5GHz network (not supported)
- Network has special characters

**Solutions:**
1. Double-check WiFi password
2. Use 2.4GHz network
3. Click "Change WiFi" and re-enter

### "Frame already paired"

**Cause:**
- Frame is paired to another account

**Solution:**
1. Press ESP32 reset button for 5 seconds
2. Wait for LED to blink
3. Try pairing again

### BLE Permission Errors (Android)

**Cause:**
- Location permission not granted

**Solution:**
1. Go to phone Settings → Apps → NovoFrame
2. Enable Location permission
3. Restart app

## 🔍 Debugging

### Enable Debug Logs

In your terminal where `npm start` is running, you'll see console.log output:

```
Received SSID: YourWiFiName
Received WiFi Password
Received Encryption Key
SSID sent
Password sent
Encryption key sent
All data sent successfully!
```

### Check BLE Connection

If BLE issues occur:
1. Close app completely
2. Turn Bluetooth off/on
3. Restart app
4. Try pairing again

### Check Server Connection

Make sure your API is running:
- Check `API_BASE_URL` in `src/constants/index.ts`
- Default: `https://api.novoframe.de`
- Or set `EXPO_PUBLIC_API_URL` environment variable

## 📊 App State After Phase 1

### What Works ✅
- User registration/login
- Profile viewing
- Frame pairing via BLE
- WiFi configuration
- Encryption key generation
- Frame list with navigation
- Multiple frames support

### What's Not Implemented Yet ❌
- Image upload
- Image display on frames
- Frame deletion
- Frame renaming
- Image gallery
- Push notifications

These will come in Phase 2!

## 🔐 Security Notes

### Encryption Keys
- Generated on device (256-bit AES)
- Stored in secure storage
- Never sent to server
- Unique per frame

### API Keys
- Generated by server
- Stored on ESP32
- Used for frame authentication
- Separate from user JWT tokens

## 📝 API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/frames` | GET | List user's frames |
| `/api/frames/pair` | POST | Pair frame to account |
| `/api/frames/{mac}` | PUT | Update frame name |
| `/api/frames/{mac}` | DELETE | Remove frame |

## 🎨 Design System

All screens use consistent styling:

```typescript
// Colors
Primary: #DC2626 (Red)
Background: #FFFFFF (White)
Text Primary: #111827
Text Secondary: #6B7280

// Typography
Title: 32px, bold
Subtitle: 16px, regular
Body: 16px, regular

// Components
Button Height: 60px
Border Radius: 16px
Spacing: 8, 16, 24, 32, 48px
```

## 🐛 Known Issues

1. **iOS MAC Address**: iOS doesn't expose real MAC address. The app uses device UUID instead. Your ESP32 code should handle this.

2. **Android 12+**: Requires runtime Bluetooth permissions. The app requests these automatically.

3. **Background BLE**: BLE connection is closed after setup to save battery. This is expected behavior.

## 📞 Need Help?

Check the following files for implementation details:

- **BLE Service**: `src/services/bleService.ts`
- **Frame Service**: `src/services/frameService.ts`
- **Encryption**: `src/utils/encryption.ts`
- **Setup Flow**: `src/screens/FrameSetupScreen.tsx`

## ✅ Next Steps

After successful testing of Phase 1:

1. **Test with multiple ESP32 devices**
2. **Test WiFi connection with different networks**
3. **Verify encryption keys are stored correctly**
4. **Test error scenarios (wrong password, out of range, etc.)**
5. **Prepare for Phase 2: Image Upload**

---

**Happy Testing! 🎉**

If everything works, you're ready to add image upload functionality in Phase 2!

