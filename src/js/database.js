/**
 * Smart Fleet OS - Multi-Database State & Flow Controller
 * Depot 44 (Chandapura), Bengaluru
 *
 * Implements 4 distinct databases for the 4 workflow roles:
 *  1. EntryRecorderDB - Depot intake database (owns the full 122-bus fleet)
 *  2. CleanerDB        - Cleaning bay operations database
 *  3. ChargingDB       - Charging infrastructure operations database
 *  4. SchedulerDB      - Route assignment & dispatch operations database
 *
 * Flow Rule:
 *  Entry Recorder: approved -->> Cleaner AND Charging Incharge: approved from BOTH -->> Scheduler
 */

(function (window) {
    'use strict';

    // Storage Keys for the 4 separate databases
    const DB_KEYS = {
        ENTRY_RECORDER: 'smart_fleet_db_entry_recorder',
        CLEANER: 'smart_fleet_db_cleaner',
        CHARGING: 'smart_fleet_db_charging',
        SCHEDULER: 'smart_fleet_db_scheduler'
    };

    // Helper: Safe JSON load/save
    function loadDB(key, fallback = {}) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            console.error(`Error loading database [${key}]:`, e);
            return fallback;
        }
    }

    function saveDB(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`Error saving database [${key}]:`, e);
        }
    }

    // Helper: get base fleet data
    function getBaseFleet() {
        if (typeof FLEET !== 'undefined' && Array.isArray(FLEET) && FLEET.length > 0) {
            return FLEET;
        }
        if (window.FLEET && Array.isArray(window.FLEET)) {
            return window.FLEET;
        }
        return [];
    }

    // =========================================================================
    // 1. Entry Recorder Database
    // =========================================================================
    const EntryRecorderDB = {
        name: 'EntryRecorderDatabase',
        table: 'entry_recorder_buses',

        init() {
            let data = loadDB(DB_KEYS.ENTRY_RECORDER, null);
            if (!data) {
                const baseFleet = getBaseFleet();
                data = {};
                baseFleet.forEach(bus => {
                    const id = bus.id || bus.busId;
                    data[id] = {
                        busId: id,
                        regNo: bus.regNo || bus.reg || 'N/A',
                        cat: bus.cat || 'B',
                        actualRange: bus.actualRange || 85.0,
                        driver: bus.driver || null,
                        entryApproved: false,
                        approvedAt: null,
                        operator: null
                    };
                });
                saveDB(DB_KEYS.ENTRY_RECORDER, data);
            }
            return data;
        },

        getAll() {
            const data = this.init();
            return Object.values(data);
        },

        // Buses waiting for entry approval (unapproved)
        getPending() {
            return this.getAll().filter(b => !b.entryApproved);
        },

        // Approve entry for a bus -> shifts bus into Cleaner & Charging databases
        approveBus(busId, operator = 'Entry Recorder') {
            const data = this.init();
            if (!data[busId]) {
                throw new Error(`Bus ${busId} not found in Entry Recorder Database`);
            }

            data[busId].entryApproved = true;
            data[busId].approvedAt = new Date().toISOString();
            data[busId].operator = operator;
            saveDB(DB_KEYS.ENTRY_RECORDER, data);

            // FLOW: Entry recorder: yes -->> shifts to Cleaner AND Charging Incharge
            CleanerDB.syncFromEntry(data[busId]);
            ChargingDB.syncFromEntry(data[busId]);

            // Dispatch event for reactive UI updates
            window.dispatchEvent(new CustomEvent('fleet-db-updated', { detail: { stage: 'entry', busId } }));
            return data[busId];
        },

        reset() {
            localStorage.removeItem(DB_KEYS.ENTRY_RECORDER);
            return this.init();
        }
    };

    // =========================================================================
    // 2. Cleaner Database
    // =========================================================================
    const CleanerDB = {
        name: 'CleanerDatabase',
        table: 'cleaner_buses',

        init() {
            let data = loadDB(DB_KEYS.CLEANER, null);
            if (!data) {
                data = {};
                saveDB(DB_KEYS.CLEANER, data);
            }
            return data;
        },

        // Sync bus when approved by Entry Recorder
        syncFromEntry(busRecord) {
            const data = this.init();
            if (!data[busRecord.busId]) {
                data[busRecord.busId] = {
                    busId: busRecord.busId,
                    regNo: busRecord.regNo,
                    cat: busRecord.cat,
                    actualRange: busRecord.actualRange,
                    cleanApproved: false,
                    cleanedAt: null,
                    operator: null
                };
                saveDB(DB_KEYS.CLEANER, data);
            }
        },

        getAll() {
            return Object.values(this.init());
        },

        // Buses that have entered depot but not yet cleaned
        getPending() {
            return this.getAll().filter(b => !b.cleanApproved);
        },

        approveBus(busId, operator = 'Cleaning Staff') {
            const data = this.init();
            if (!data[busId]) {
                throw new Error(`Bus ${busId} not found in Cleaner Database`);
            }

            data[busId].cleanApproved = true;
            data[busId].cleanedAt = new Date().toISOString();
            data[busId].operator = operator;
            saveDB(DB_KEYS.CLEANER, data);

            // Check if Charging has also approved -> if so, bus enters Scheduler
            SchedulerDB.checkAndEnroll(busId);

            window.dispatchEvent(new CustomEvent('fleet-db-updated', { detail: { stage: 'cleaner', busId } }));
            return data[busId];
        }
    };

    // =========================================================================
    // 3. Charging Database
    // =========================================================================
    const ChargingDB = {
        name: 'ChargingDatabase',
        table: 'charging_buses',

        init() {
            let data = loadDB(DB_KEYS.CHARGING, null);
            if (!data) {
                data = {};
                saveDB(DB_KEYS.CHARGING, data);
            }
            return data;
        },

        // Sync bus when approved by Entry Recorder
        syncFromEntry(busRecord) {
            const data = this.init();
            if (!data[busRecord.busId]) {
                data[busRecord.busId] = {
                    busId: busRecord.busId,
                    regNo: busRecord.regNo,
                    cat: busRecord.cat,
                    actualRange: busRecord.actualRange,
                    chargeApproved: false,
                    chargedAt: null,
                    operator: null
                };
                saveDB(DB_KEYS.CHARGING, data);
            }
        },

        getAll() {
            return Object.values(this.init());
        },

        // Buses that have entered depot but not yet charge approved
        getPending() {
            return this.getAll().filter(b => !b.chargeApproved);
        },

        approveBus(busId, operator = 'Charging Incharge') {
            const data = this.init();
            if (!data[busId]) {
                throw new Error(`Bus ${busId} not found in Charging Database`);
            }

            data[busId].chargeApproved = true;
            data[busId].chargedAt = new Date().toISOString();
            data[busId].operator = operator;
            saveDB(DB_KEYS.CHARGING, data);

            // Check if Cleaner has also approved -> if so, bus enters Scheduler
            SchedulerDB.checkAndEnroll(busId);

            window.dispatchEvent(new CustomEvent('fleet-db-updated', { detail: { stage: 'charging', busId } }));
            return data[busId];
        }
    };

    // =========================================================================
    // 4. Scheduler Database
    // =========================================================================
    const SchedulerDB = {
        name: 'SchedulerDatabase',
        table: 'scheduler_ready_buses',

        init() {
            let data = loadDB(DB_KEYS.SCHEDULER, null);
            if (!data) {
                data = {};
                saveDB(DB_KEYS.SCHEDULER, data);
            }
            return data;
        },

        /**
         * FLOW RULE 2.1:
         * Cleaner AND Charging incharge: yes from BOTH of them -->> Scheduler
         */
        checkAndEnroll(busId) {
            const cleanerData = CleanerDB.init();
            const chargingData = ChargingDB.init();
            const schedulerData = this.init();

            const isClean = cleanerData[busId] && cleanerData[busId].cleanApproved;
            const isCharged = chargingData[busId] && chargingData[busId].chargeApproved;

            if (isClean && isCharged) {
                // Bus is approved by both! Enroll into scheduler database ready pool
                if (!schedulerData[busId]) {
                    const entryData = EntryRecorderDB.init();
                    const busInfo = entryData[busId] || cleanerData[busId];
                    schedulerData[busId] = {
                        busId: busId,
                        regNo: busInfo.regNo,
                        cat: busInfo.cat,
                        actualRange: busInfo.actualRange,
                        driver: busInfo.driver || null,
                        enrolledAt: new Date().toISOString(),
                        scheduleAssigned: null,
                        assignedDriver: null,
                        assignedAt: null
                    };
                    saveDB(DB_KEYS.SCHEDULER, schedulerData);
                }
            }
        },

        getAll() {
            return Object.values(this.init());
        },

        // Buses ready in pool (clean + charged + unassigned)
        getReadyPool() {
            // Also run a sweep to ensure any already double-approved buses are enrolled
            const cleanerData = CleanerDB.init();
            const chargingData = ChargingDB.init();
            Object.keys(cleanerData).forEach(busId => {
                if (cleanerData[busId].cleanApproved && chargingData[busId]?.chargeApproved) {
                    this.checkAndEnroll(busId);
                }
            });

            return this.getAll().filter(b => !b.scheduleAssigned);
        },

        assignBus(busId, scheduleId, driverName) {
            const data = this.init();
            if (!data[busId]) {
                throw new Error(`Bus ${busId} is not in the Scheduler Ready Pool`);
            }

            data[busId].scheduleAssigned = scheduleId;
            data[busId].assignedDriver = driverName;
            data[busId].assignedAt = new Date().toISOString();
            saveDB(DB_KEYS.SCHEDULER, data);

            window.dispatchEvent(new CustomEvent('fleet-db-updated', { detail: { stage: 'scheduler', busId, scheduleId } }));
            return data[busId];
        },

        getAssignments() {
            return this.getAll().filter(b => b.scheduleAssigned);
        },

        /**
         * Return a scheduled bus back to depot (reset all databases for reuse)
         * This completes the workflow cycle
         */
        returnToDepot(busId) {
            // Remove from Scheduler database
            const schedulerData = this.init();
            if (schedulerData[busId]) {
                delete schedulerData[busId];
                saveDB(DB_KEYS.SCHEDULER, schedulerData);
            }

            // Reset Entry Recorder database (so bus can go through workflow again)
            const entryData = EntryRecorderDB.init();
            if (entryData[busId]) {
                entryData[busId].entryApproved = false;
                entryData[busId].approvedAt = null;
                entryData[busId].operator = null;
                saveDB(DB_KEYS.ENTRY_RECORDER, entryData);
            }

            // Reset Cleaner database
            const cleanerData = CleanerDB.init();
            if (cleanerData[busId]) {
                cleanerData[busId].cleanApproved = false;
                cleanerData[busId].cleanedAt = null;
                cleanerData[busId].operator = null;
                saveDB(DB_KEYS.CLEANER, cleanerData);
            }

            // Reset Charging database
            const chargingData = ChargingDB.init();
            if (chargingData[busId]) {
                chargingData[busId].chargeApproved = false;
                chargingData[busId].chargedAt = null;
                chargingData[busId].operator = null;
                saveDB(DB_KEYS.CHARGING, chargingData);
            }

            // Dispatch event for reactive UI updates
            window.dispatchEvent(new CustomEvent('fleet-db-updated', { detail: { stage: 'returned_to_depot', busId } }));

            return true;
        }
    };

    // Synchronize initial state across all 4 databases on load
    function initAllDatabases() {
        EntryRecorderDB.init();
        CleanerDB.init();
        ChargingDB.init();
        SchedulerDB.init();

        // Propagate any pre-existing entry approvals
        const entryAll = EntryRecorderDB.getAll();
        entryAll.forEach(b => {
            if (b.entryApproved) {
                CleanerDB.syncFromEntry(b);
                ChargingDB.syncFromEntry(b);
            }
        });

        // Enroll any already double-approved buses
        const cleanerAll = CleanerDB.getAll();
        const chargingData = ChargingDB.init();
        cleanerAll.forEach(b => {
            if (b.cleanApproved && chargingData[b.busId]?.chargeApproved) {
                SchedulerDB.checkAndEnroll(b.busId);
            }
        });
    }

    // Reset all databases back to factory depot state
    function resetAllDatabases() {
        localStorage.removeItem(DB_KEYS.ENTRY_RECORDER);
        localStorage.removeItem(DB_KEYS.CLEANER);
        localStorage.removeItem(DB_KEYS.CHARGING);
        localStorage.removeItem(DB_KEYS.SCHEDULER);
        initAllDatabases();
    }

    // Expose to window
    window.FleetDB = {
        EntryRecorder: EntryRecorderDB,
        Cleaner: CleanerDB,
        Charging: ChargingDB,
        Scheduler: SchedulerDB,
        initAll: initAllDatabases,
        resetAll: resetAllDatabases
    };

    // Auto-initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAllDatabases);
    } else {
        initAllDatabases();
    }

})(window);
