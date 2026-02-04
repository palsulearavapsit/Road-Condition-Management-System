# CrackX (RCMS) - Road Complaint Management System

CrackX is a comprehensive, enterprise-grade mobile-first application designed to streamline the reporting, repair, and monitoring of road damage. It connects Citizens, Road Safety Officers (RSO), and Government Administrators in a unified ecosystem powered by AI and Real-time data.

## 🚀 Key Features

### 🌟 1. Multi-Role Ecosystem
The platform adapts its entire interface and functionality based on the logged-in user:
*   **Citizen**: Report issues, track status, and earn rewards.
*   **RSO (Road Safety Officer)**: Manage field work, log materials, and verify repairs.
*   **Admin**: Oversee the city’s road health, manage the points economy, and approve users.

### 📸 2. Smart Complaint Submission
*   **AI-Powered Detection**: Automatically analyzes images to identify damage types (Pothole, Crack) and severity levels (High, Medium, Low).
*   **Dual Reporting Modes**:
    *   **On-Site**: Captures precise GPS coordinates using device sensors.
    *   **From-Elsewhere**: Interactive Map Picker for reporting issues after the fact.
*   **Automated Geozoning**: Automatically routes complaints to the responsible RSO Zone based on geolocation.
*   **Cloud Gallery**: Securely stores and retrieves high-resolution damage photos.

### 🛠️ 3. RSO Field Execution Portal
*   **Targeted Feeds**: Officers only see complaints within their assigned jurisdiction (e.g., Zone 1, 4, or 8).
*   **Digital Proof of Work**: Requires a "Solution Photo" to mark tasks as completed, ensuring accountability.
*   **Inventory & Logistics Tracking**: RSOs log the exact quantity of materials used (Asphalt, Concrete, Sealant) for every fix.
*   **GPS Guided Dispatch**: Coordinates provided for every task to ensure rapid response times.

### 💎 4. Advanced Points & Incentives Engine
*   **Gamified Civic Engagement**:
    *   **+10 Points**: Valid report submission (Admin Approved).
    *   **+20 Points**: Successful repair bonus (verified by Admin).
*   **Admin Point Pool**: A centralized, rechargeable wallet for distributing rewards.
*   **Real-time Wallets**: Citizen balances and the Admin pool update across all screens instantly.
*   **Optimistic UI**: High-performance UI updates that reflect transactions immediately.

### 🔔 5. Real-Time In-App Notifications
*   **Instant Alerts**: Integrated via Supabase Realtime (WebSockets).
*   **Role-Based Triggers**:
    *   **RSOs**: Get coordinates and road names immediately when a new report is filed.
    *   **Citizens**: Recieve a "Solution Uploaded" alert the moment the pothole is fixed.
    *   **Admins**: Full activity stream of reports and repairs.
*   **Notification Center**: Pulsing header bell and unread badges for constant situational awareness.

### 📊 6. Admin Governance & Analytics
*   **Disaster Heatmap**: A spatial visualization of damage "Hotspots" across the city.
*   **RSO Approval Pipeline**: Manual vetting of officers to ensure secure access.
*   **Repair Verification**: Side-by-side comparison of "Before" vs "After" images for quality control.

### ⚙️ 7. Premium UX & Localization
*   **🌐 Quad-Language Support**: Fully translated in **English**, **Hindi (हिंदी)**, **Marathi (मराठी)**, and **Kannada (ಕನ್ನಡ)**.
*   **Offline First Logic**: Uses a hybrid sync service (Supabase Cloud + local AsyncStorage) to ensure the app works in low-signal areas.
*   **Modern Aesthetics**: Premium "Glassmorphism" design with smooth `LayoutAnimation` transitions and high-contrast accessibility.

---

## 🛠️ Technical Stack
*   **Frontend**: React Native (Expo) - Mobile-First Responsive Design.
*   **Backend**: Supabase (PostgreSQL + Realtime).
*   **Storage**: Supabase Storage Buckets.
*   **State Management**: React Hooks & Context.
*   **Internationalization**: i18next.

## 🔑 Demo Credentials

### 🏛️ Admin Accounts
*   **Master Admin**: `admin` / `admin123`

### 🚧 Road Safety Officers (RSO)
*   **Zone 1 Officer (Rugved)**: `rugved` / `rugved`
*   **Zone 4 Officer (Deep)**: `deep` / `deep`
*   **Zone 8 Officer (Atharva)**: `atharva` / `atharva`

### 👥 Citizen Accounts
*   **User Arav**: `arav` / `arav`
*   **User Abbas**: `abbas` / `abbas`

---

Built with ❤️ for a safer and smoother city infrastructure.
