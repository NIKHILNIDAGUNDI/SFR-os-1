# Smart Fleet OS - Transit Dispatch Operating System

## Overview
Smart Fleet OS is a production-grade transit dispatch operating system designed for Chandapura Depot 44 (Bengaluru) serving Ashok Leyland/Switch Mobility electric buses. The system manages the complete workflow from bus depot entry through cleaning, charging, and finally route scheduling/dispatch.

## System Architecture
- **Single-page vanilla HTML/CSS/JS application** (~257 KB) - No build step required
- **Leaflet.js** for GIS radar map visualization
- **Chart.js** for telemetry data visualizations  
- **Dual-mode color system** (light/dark themes) based on strict color theory principles
- **LocalStorage-based database system** with 4 isolated databases for different workflow roles

## Key Features

### 1. Complete Five-Stage Workflow
The system implements a complete closed-loop workflow:
1. **Entry Recorder** - Records bus entry into depot, performs initial checks
2. **Cleaner Hub** - Manages cleaning bay operations and approvals
3. **Charging Incharge** - Oversees charging infrastructure and approves charging status
4. **Scheduler Console** - Assigns buses to routes and drivers (requires BOTH Cleaner AND Charging approvals)
5. **Return to Depot** - After scheduled duty, buses return to depot for reuse in the workflow
- **Number plate scanning** - Entry Recorder, Cleaner, and Charging can use a device camera and browser-based OCR to find and highlight a matching bus in the current depot queue. Camera access requires HTTPS or localhost; captured frames are processed in the browser and are not uploaded.

### 6. Depot Configuration System
- **Admin Interface** - `admin.html` (advanced) and `admin_simple.html` (simple) for configuring depot-specific settings
- **Multi-Depot Support** - Enables deployment of the system to multiple depots with different configurations
- **Persistent Storage** - Configurations saved to browser localStorage
- **Flexible Data Structure** - Supports custom fleet data, schedules, routes, and infrastructure parameters
- **User-Friendly Options**: Choose between advanced JSON-based configuration or simple form-based setup for depot staff with limited technical experience

### 2. Individual Module Files
Each workflow role has its own dedicated HTML interface:
- `entry_recorder.html` - Depot intake and initial bus screening
- `cleaner.html` - Cleaning bay management and approvals
- `charging.html` - Charging infrastructure monitoring and approvals  
- `scheduler.html` - Route and driver assignment console
- `charger.html` *(Newly added)* - Charger infrastructure management and monitoring

### 3. Data Management
- **Real bus fleet data**: 122 buses with actual registrations (KA51AH/KAA1AJ series)
- **Real tested ranges**: 62-136 km per bus based on battery SOH
- **Form 4 schedule data**: 130 schedules across 4 shifts (Night Halt, General, Shift A, Shift B)
- **9 core corridors** served: 328H, 600F, 360K, KBS-3A, 500DC, 356Z, 361C, 399C + Depot Hub

### 4. Technical Implementation
- **Four isolated databases** using localStorage:
  - `smart_fleet_db_entry_recorder`
  - `smart_fleet_db_cleaner` 
  - `smart_fleet_db_charging`
  - `smart_fleet_db_scheduler`
- **Automatic workflow progression**: When both Cleaner AND Charging approve a bus, it automatically moves to the Scheduler ready pool
- **Complete workflow cycle**: After scheduling, buses can be returned to depot for reuse in the workflow
- **Theme persistence**: Light/dark mode preference saved in localStorage
- **Input sanitization**: XSS protection on all user inputs
- **Mock authentication**: Role-based access control for each module

## File Structure
```
dispatch_workflow/
├── dispatcher_workflow_no_time.html     # Main application (all views)
├── entry_recorder.html                  # Entry Recorder module
├── cleaner.html                         # Cleaner Hub module  
├── charging.html                        # Charging Incharge module
├── scheduler.html                       # Scheduler Console module
├── charger.html                         # Charger Management module (added)
├── data/
│   ├── fleet_data.json                  # 122-bus fleet dataset
│   ├── Form 4 *.xlsx                    # Schedule source data
│   └── ...                              # Other Excel data files
├── src/
│   ├── data/
│   │   └── app_data.js                  # Shared fleet data constants
│   └── js/
│       └── database.js                  # Multi-database state controller
└── assets/                              # Static assets (icons, images, etc.)
```

## Usage Instructions

### Accessing Modules
Each module can be accessed directly via its HTML file:
- Entry Recorder: Open `entry_recorder.html` in browser
- Cleaner Hub: Open `cleaner.html` in browser
- Charging Incharge: Open `charging.html` in browser
- Scheduler Console: Open `scheduler.html` in browser
- Charger Management: Open `charger.html` in browser

### Workflow Process
1. **Entry Recorder**: 
   - Select bus from "Not Yet Entry Approved" dropdown
   - Review bus details (registration, category, actual range, etc.)
   - Click "Submit" to approve entry
   - Bus is forwarded to both Cleaner AND Charging queues

2. **Cleaner Hub**:
   - Select bus from cleaning queue
   - Verify cleaning completion
   - Click "Submit" to approve cleaning
   - If Charging also approved, bus moves to Scheduler ready pool

3. **Charging Incharge**:
   - Select bus from charging queue
   - Verify charging status/completion
   - Click "Submit" to approve charging
   - If Cleaner also approved, bus moves to Scheduler ready pool

4. **Scheduler Console**:
   - View available buses in ready pool (requires BOTH approvals)
   - Select route/schedule from dropdown
   - System recommends optimal bus based on:
     - Category matching (A/B/C)
     - Actual range vs route requirements
     - Safety buffer calculations
   - Select driver (defaults to bus-assigned driver when available)
   - Click "Finalize Assignment" to dispatch bus

5. **Return to Depot**:
   - After scheduled duty completion
   - Logout from Scheduler Console automatically returns bus to depot
   - Bus becomes available again in Entry Recorder for reuse
   - Completes the closed-loop workflow cycle

### Themes
- Toggle between light/dark modes using the theme button in each module
- Preference persists across sessions via localStorage

## Business Rules Enforced
- **Slide 4 Allocation Matrix logic**: Bus categories (A/B/C) × time slots × route difficulty
- **Dual-mode color system**: Strict adherence to professional slate & deep blue palette (no neon colors)
- **Real bus data validation**: All bus data must match actual City Transit/Switch Mobility registrations
- **Charging kinetics**: CC-CV model accuracy maintained (1.08%/min CC, 0.44%/min CV)
- **Infrastructure limits**: 2.8 MW substation cap enforced in charger scheduling

## Data Integrity
- Fleet data sourced from real depot operations with actual bus registrations
- Schedule data derived from official Form 4 documents
- Range calculations based on tested battery SOH (State of Health)
- Maintenance status tracking integrated throughout workflow

## Customization
The system is designed for easy deployment and customization:
- Color variables defined in CSS `:root` for easy theming
- Modular HTML files allow independent development/work on each workflow role
- Shared data constants in `src/data/app_data.js`
- Centralized database logic in `src/js/database.js`
- Depot configuration loader in `src/js/depotConfig.js` for multi-depot support

## Depot Configuration
Two admin interfaces are available for configuring depot-specific settings:

### 1. Advanced Configuration (`admin.html`)
- For technical users comfortable with JSON format
- Full control over all configuration aspects
- Supports complex data structures and validation
- Ideal for initial setup and detailed configuration

### 2. Simple Configuration (`admin_simple.html`)
- Designed for depot staff with limited technical experience
- Uses simple formatted text (CSV-like) instead of JSON
- Step-by-step workflow with visual guidance
- Built-in validation and helpful examples
- Perfect for ongoing maintenance and quick updates

### 3. Entity Management (`entity_admin.html`)
- Complete CRUD (Create, Read, Update, Delete) interface for managing core data entities
- Manage buses, drivers, and routes with full validation
- Search, filter, and export capabilities (CSV)
- User-friendly interface designed for depot administrators
- Real-time data persistence to localStorage

All interfaces save configurations to browser localStorage, which is automatically loaded by all Smart Fleet OS modules. This enables true multi-depot deployment where the same codebase can serve multiple depots with different fleet data, schedules, routes, and infrastructure parameters.

## Notes
- This is a client-side only implementation - no server components required
- All data persists in browser localStorage (clearing browser data resets the system)
- For production deployment, consider integrating with actual backend APIs for charger hardware, GPS tracking, etc.
- The newly added `charger.html` provides a foundation for charger infrastructure management that can be expanded with real API integrations

## Cross-Depot Bus Synchronization & Tracking

### Overview
In multi-depot transit networks, individual physical buses frequently operate across routes spanning multiple depots or are shared among depots (e.g., Bus `KA-25-1234` shared across Chandapura, Tondiarpet, and Miyapur). Without centralized coordination, multiple depots could independently record entry for the same vehicle, resulting in ghost fleet counts, duplicate logs, and operational confusion.

Smart Fleet OS now incorporates native **Cross-Depot Bus Synchronization and Tracking**:
1. **Central Bus Identity & Linking**:
   - Each physical vehicle has a globally unique ID and registration number.
   - When a bus operates across multiple depots, it is associated via `linkedDepots: ['chandapura', 'tondiarpet', 'miyapur']` rather than duplicating vehicle records.
2. **Automatic List Synchronization**:
   - When Depot B marks a shared bus as "Entered", the central record is updated (`loc: 'tondiarpet', entry: true, entryDepot: 'tondiarpet'`).
   - The bus is instantly removed/hidden from the available-for-entry lists (`isAvailableForEntry`) of all other linked depots (Depot A, Depot C, etc.).
   - At Depot B, the bus appears in the approved intake list and progresses down the cleaning, charging, and scheduling pipeline.
3. **Confirmed Transfer & Departure Isolation**:
   - When a bus departs Depot A bound for Depot B, its status updates to `transferStatus: 'in_transit'` and `transferTo: 'depot_b'`.
   - The bus does NOT automatically become available at all linked depots. It is available for entry **exclusively** at the designated destination depot upon arrival.
4. **Duplicate & Conflict Prevention**:
   - The bus registration parser (`parseBusRows`) matches existing vehicles by bus code and registration number. If the exact vehicle already exists, it links the depot without creating duplicate records.
   - If a registration number is entered with a conflicting bus code (or vice-versa), the operation is rejected with an explanatory error.
   - If two depots attempt concurrent entry on the same bus, the second attempt is blocked with a clear warning: `Concurrent Entry Blocked: Bus ... is ALREADY entered at ...`.
5. **Real-Time Cross-Tab & Session Persistence**:
   - Changes are persisted to central `sfos_multi_v2` storage and propagated across browser tabs and views via `window.addEventListener('storage', ...)`.

### Automated Acceptance Tests
The test suite in `test_cross_depot_sync.js` verifies all 10 user acceptance criteria:
1. **Shared Bus List Synchronization**: Entering at one depot removes from all other linked depots.
2. **Unrelated Fleet Isolation**: Operating on one bus leaves other buses unaffected.
3. **Multi-Depot Scalability**: Verified for $N \ge 3$ depots simultaneously.
4. **Duplicate Registration Prevention**: Exact identity matching links vehicles; conflicts are blocked.
5. **Repeated Action Idempotency**: Re-clicking entry at the current depot notifies without duplicating state.
6. **Concurrent Entry Enforcement**: Simultaneous entry attempts at different depots fail safely.
7. **Departure Handling**: Departing a depot does not make a vehicle available everywhere.
8. **Confirmed Transfer**: In-transit buses are intake-available only at the destination depot.
9. **Persistence**: Synchronized multi-depot state survives simulated reloads and storage events.
10. **Workflow Regression**: Full progression through Cleaner, Charging Incharge, and Scheduler ready pool functions seamlessly.

To run the test suite:
```bash
node test_cross_depot_sync.js
```

---
*Smart Fleet OS - Multi-Depot Operations & Cross-Depot Synchronization*  
*For Ashok Leyland / Switch Mobility / City Transit Operations*