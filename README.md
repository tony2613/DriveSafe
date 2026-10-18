# DriveSafe SDK™
> Enterprise Telematics & In-App UI Touch Enforcement Layer for Gig-Economy Fleets

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-blue.svg)](LICENSE)
[![Status: Production Ready](https://img.shields.io/badge/Status-v2.4--STABLE-emerald.svg)]()
[![Target: InsurTech & Gig Fleets](https://img.shields.io/badge/Target-Zomato%20%7C%20Swiggy%20%7C%20Uber%20%7C%20Zepto-orange.svg)]()

---

## 💡 Executive Summary
**DriveSafe** solves distracted driving in the gig-economy by transitioning safety enforcement from an optional consumer toggle to a **mandatory, embedded B2B SDK** inside worker applications (like the Uber or Zomato Driver app).

Because the gig worker is logged into an active work shift, the classic *I'm a passenger* consumer blindspot is eliminated. The SDK silently operates in the background, continuously measuring vehicle velocity and dynamically controlling which coordinate bounds of the screen can be touched.

---

## 🛠️ Core Feature Architecture

### 1. Passive Speed Telematics Thread
- Runs on a lightweight background execution thread.
- Uses low-power Fused Location & accelerometer monitoring, waking high-accuracy GPS only during sustained acceleration to conserve driver battery.

### 2. Enforced UI Overlay Shield (Map Lock)
- The instant velocity crosses **15 km/h**, the SDK drops an invisible, touch-blocking shield across the screen.
- **Punch-Through Window**: Dynamically carves out coordinate bounds allowing touch inputs to reach the navigation map only. Tapping dangerous sub-menus (chat, earnings, profile) absorbs the touch and logs an infraction.

### 3. Stationary Debounce Buffer (Traffic Light Timer)
- When vehicle speed drops to 0 km/h at a red light, a **4-second debounce countdown** activates.
- Prevents drivers from rapidly opening chats/videos the moment wheels halt, requiring 4 continuous seconds of stationary rest before unlocking.

### 4. Emergency & SOS Punch-Through
- Hardcoded coordinate whitelist. Tapping the native **SOS button** or opening emergency dispatch (100 / 112) bypasses all shields under any speed condition.

### 5. BTP Hotspot Integration & Risk Brain
- Embedded coordinate matrix of prominent **Bengaluru Traffic Police (BTP)** accident blackspots:
  - *Central Silk Board Junction (Hosur Rd / Outer Ring Rd)*
  - *Tin Factory / KR Puram Hanging Bridge Node*
  - *Hebbal Flyover Expressway Ramp*
  - *Marathahalli Multiplex Junction*
  - *Electronic City Elevated Toll Exit*
  - *Goraguntepalya / Tumkur Road Junction*
- Real-time Haversine geofencing tracks entry into high-risk collision zones.

### 6. Gamified Strike State Machine
- **Standard Zones**: 3 visual warning strikes before triggering an internal driver rating penalty.
- **BTP Hotspot Zones**: Switches to **Zero-Tolerance 1-Strike Mode**. The warning loop is bypassed—the first infraction inside a hotspot triggers an instant rating deduction.
- **Positive Reinforcement**: Shifts completed with zero strikes earn a Safety Boost priority queue.

### 7. Encrypted Telematics Data Payload
- Generates a tamper-evident, digitally signed JSON payload containing timestamps, infraction coordinates, average/peak speeds, and hotspot transits.
- Ready for automated ingestion by commercial fleet underwriters (**Digit, ICICI Lombard, Acko**) to certify safe driving and unlock insurance premium discounts.

---

## 🚀 Quickstart & Simulator

### Prerequisites
- Node.js 18+ and npm

### Installation & Running the Live Simulator
`ash
# Clone the repository
git clone https://github.com/tony2613/drivesafe-sdk.git
cd drivesafe-sdk

# Install dependencies
npm install

# Start local interactive simulator
npm run dev
`

Visit http://localhost:5173/ to interact with the live Telematics Cockpit, throttle vehicle speed, test touch punch-throughs, and export insurance payloads.

---

## 📂 Project Structure
`
drivesafe-sdk/
├── sdk/
│   ├── types.ts       # Core TypeScript data contracts & payload models
│   ├── hotspots.ts    # BTP accident blackspots matrix & Haversine geofence engine
│   ├── engine.ts      # State machine, touch shield evaluation, and debounce timer
│   └── index.ts       # SDK public export entrypoint
├── index.html         # Live interactive simulator web app
├── main.ts            # Simulator wiring and event dispatcher
├── style.css          # Glassmorphism UI & responsive mobile phone simulator
└── package.json       # Project configuration
`

---

## 📄 License
Proprietary & Confidential - DriveSafe Technologies.
