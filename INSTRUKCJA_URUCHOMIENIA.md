# 🚀 Instrukcja uruchomienia aplikacji Expo na Androidzie

## Opcja 1: Szybkie uruchomienie (Development Build) - REKOMENDOWANE

### Krok 1: Instalacja zależności
```bash
npm install
```

### Krok 2: Uruchomienie serwera deweloperskiego
```bash
npm start
# lub
npx expo start
```

### Krok 3: Zbudowanie natywnej aplikacji Android (pierwszy raz)
```bash
npx expo run:android
```

To polecenie:
- Automatycznie wygeneruje folder `android/` z natywnym kodem Android
- Zbuduje aplikację APK
- Zainstaluje ją na podłączonym emulatorze/urządzeniu
- Uruchomi aplikację

**Uwaga:** Pierwsze budowanie może zająć 10-20 minut.

### Krok 4: Otwarcie w Android Studio (opcjonalne)
Po pierwszym `expo run:android`, możesz otworzyć projekt w Android Studio:

1. Otwórz Android Studio
2. File → Open
3. Wybierz folder `android/` w projekcie
4. Poczekaj na synchronizację Gradle

### Krok 5: Dalsze uruchomienia
Po pierwszym buildzie, możesz używać:
- **Z terminala:** `npm run android` lub `npx expo run:android`
- **Z Android Studio:** Otwórz projekt i kliknij "Run" (Shift+F10)

---

## Opcja 2: Użycie Expo Go (szybsze, ale ograniczone)

### Krok 1: Instalacja Expo Go na telefonie
Zainstaluj aplikację **Expo Go** z Google Play Store na swoim telefonie Android.

### Krok 2: Uruchomienie serwera
```bash
npm start
```

### Krok 3: Połączenie
- Zeskanuj kod QR z terminala aplikacją Expo Go
- Lub naciśnij `a` w terminalu, aby otworzyć na Androidzie

**UWAGA:** Expo Go nie obsługuje wszystkich natywnych modułów. Jeśli używasz `expo-print`, `expo-sqlite`, `expo-notifications` itp., musisz użyć **Opcji 1** (Development Build).

---

## Opcja 3: Uruchomienie bezpośrednio z Android Studio

### Krok 1: Wygeneruj natywny kod Android
```bash
npx expo prebuild
```

To stworzy folder `android/` z pełnym projektem Android.

### Krok 2: Otwórz w Android Studio
1. Otwórz Android Studio
2. File → Open → wybierz folder `android/`
3. Poczekaj na synchronizację Gradle

### Krok 3: Uruchom
- Kliknij przycisk "Run" (zielona strzałka)
- Wybierz emulator lub podłączone urządzenie

### Krok 4: Uruchom serwer Metro
W osobnym terminalu:
```bash
npm start
```

---

## 🔧 Rozwiązywanie problemów

### Problem: "SDK location not found"
Rozwiązanie: Ustaw zmienną środowiskową `ANDROID_HOME`:
```bash
# Windows PowerShell
$env:ANDROID_HOME = "C:\Users\TwojaNazwa\AppData\Local\Android\Sdk"

# Windows CMD
set ANDROID_HOME=C:\Users\TwojaNazwa\AppData\Local\Android\Sdk

# Linux/Mac
export ANDROID_HOME=$HOME/Android/Sdk
```

### Problem: "Gradle sync failed"
Rozwiązanie:
1. File → Invalidate Caches / Restart w Android Studio
2. Usuń folder `.gradle` w `android/`
3. Spróbuj ponownie

### Problem: Emulator nie uruchamia się
Rozwiązanie:
1. Otwórz Android Studio
2. Tools → Device Manager
3. Utwórz nowy emulator (AVD)
4. Upewnij się, że używasz Android API 33+ (Android 13+)

### Problem: Aplikacja się nie łączy z serwerem Metro
Rozwiązanie:
- Upewnij się, że serwer Metro działa (`npm start`)
- Sprawdź, czy telefon/emulator jest w tej samej sieci WiFi
- Lub użyj tunelu: `npx expo start --tunnel`

---

## 📱 Wymagania systemowe

- **Node.js:** 18+ 
- **Android Studio:** Najnowsza wersja
- **Android SDK:** API 33+ (Android 13+)
- **Java JDK:** 17 lub 21
- **Expo CLI:** Zainstalowany globalnie (`npm install -g expo-cli`)

---

## 🎯 Rekomendowany workflow

1. **Pierwszy raz:**
   ```bash
   npm install
   npx expo run:android
   ```

2. **Codzienna praca:**
   ```bash
   # Terminal 1: Serwer Metro
   npm start
   
   # Terminal 2: Uruchomienie na Androidzie
   npm run android
   ```

3. **Edycja natywnego kodu:**
   - Otwórz `android/` w Android Studio
   - Edytuj kod natywny
   - Zbuduj i uruchom z Android Studio

---

## ⚠️ Ważne uwagi

1. **Po zmianach w `app.json` lub natywnych modułach:**
   ```bash
   npx expo prebuild --clean
   ```

2. **Po dodaniu nowych natywnych zależności:**
   ```bash
   npx expo install [nazwa-pakietu]
   ```

3. **Folder `android/` jest generowany automatycznie** - nie edytuj go ręcznie, chyba że wiesz co robisz.

4. **Dla produkcji:** Użyj EAS Build:
   ```bash
   eas build --platform android
   ```
