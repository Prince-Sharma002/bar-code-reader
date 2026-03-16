# 📱 Barcode Reader App

A full-stack mobile barcode scanning application built with **React Native (Expo)**, **Node.js/Express**, and **MongoDB**.

---

## 🗂️ Project Structure

```
qr reader/
├── backend/                    # Node.js + Express API
│   ├── config/
│   │   └── db.js               # MongoDB connection
│   ├── controllers/
│   │   └── scanController.js   # POST /scan, GET /scan-history logic
│   ├── models/
│   │   └── Scan.js             # Mongoose schema
│   ├── routes/
│   │   └── scanRoutes.js       # Route definitions
│   ├── .env                    # Environment variables
│   ├── server.js               # Express entry point
│   └── package.json
│
└── frontend/                   # React Native (Expo) App
    ├── src/
    │   ├── navigation/
    │   │   └── AppNavigator.js  # Bottom tab navigator
    │   ├── screens/
    │   │   ├── ScannerScreen.js # Real-time camera scanner
    │   │   └── HistoryScreen.js # Scan history list
    │   ├── components/
    │   │   └── ScanHistoryItem.js # Reusable history row
    │   └── services/
    │       └── apiService.js    # Axios API calls
    ├── App.js                   # Root component
    ├── app.json                 # Expo config + permissions
    └── package.json
```

---

## 🚀 Backend Setup

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on port `27017`
  - Or [MongoDB Compass](https://www.mongodb.com/products/compass) for GUI monitoring

### Steps

```bash
# 1. Navigate to backend folder
cd backend

# 2. Install dependencies
npm install

# 3. Configure .env (already created, edit if needed)
#    MONGODB_URI=mongodb://localhost:27017/barcode_reader
#    PORT=5000

# 4. Start the server
npm run dev
```

The API will be available at: `http://localhost:5000`

### API Endpoints

| Method | Endpoint           | Description                |
|--------|--------------------|----------------------------|
| POST   | `/api/scan`        | Store a scanned barcode    |
| GET    | `/api/scan-history`| Get latest 50 scans        |

### POST /api/scan Request Body
```json
{
  "barcodeValue": "123456789012",
  "format": "EAN_13",
  "deviceId": "device-001"
}
```

### MongoDB Compass
Connect to: `mongodb://localhost:27017`
- Database: `barcode_reader`
- Collection: `scans`

---

## 📱 Frontend Setup

### Prerequisites
- Node.js (v18+)
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your Android/iOS phone (for testing on device)
  - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
  - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)

### Steps

```bash
# 1. Navigate to frontend folder
cd frontend

# 2. Install dependencies
npm install

# 3. ⚠️ IMPORTANT: Update your local IP address
#    Open: src/services/apiService.js
#    Find: const BASE_URL = 'http://192.168.1.100:5000/api';
#    Replace 192.168.1.100 with your computer's actual local IP
#    
#    To find your IP on Windows: run `ipconfig` in CMD/PowerShell
#    Look for "IPv4 Address" under your Wi-Fi adapter

# 4. Start Expo dev server
npx expo start

# 5. Scan the QR code shown in terminal with Expo Go app
```

---

## 🔐 Permissions

### Android
The following permission is declared in `app.json`:
```
android.permission.CAMERA
```

### iOS
The following key is set in `app.json` under `infoPlist`:
```
NSCameraUsageDescription = "This app uses the camera to scan barcodes and QR codes."
```

---

## 📊 Supported Barcode Formats
- ✅ QR Code
- ✅ EAN-13
- ✅ EAN-8
- ✅ UPC-A / UPC-E
- ✅ Code 128
- ✅ Code 39
- ✅ PDF-417
- ✅ Aztec
- ✅ Data Matrix

---

## 🛠️ Tech Stack

| Layer       | Technology                                |
|-------------|-------------------------------------------|
| Mobile App  | React Native + Expo                       |
| Camera/Scan | expo-camera + expo-barcode-scanner        |
| Navigation  | React Navigation (Bottom Tabs)            |
| HTTP Client | Axios                                     |
| Backend     | Node.js + Express                         |
| Database    | MongoDB + Mongoose                        |
| DB GUI      | MongoDB Compass                           |
