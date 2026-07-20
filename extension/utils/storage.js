/**
 * Utility class for handling Chrome storage operations with fallback and retry mechanisms
 */

// Defaults come from utils/defaults.js, which every page that loads this file
// includes first. There is deliberately no inline fallback copy: the previous
// one had already drifted (autoAction: true here vs false in defaults.js, plus
// missing theme/anchor/saveHistory), which defeats the single-source-of-truth
// this file claims. Failing loudly beats silently serving stale defaults.
if (typeof DEFAULT_SETTINGS === 'undefined') {
    throw new Error('utils/storage.js requires utils/defaults.js to be loaded first');
}

const defaultSettings = DEFAULT_SETTINGS;

const StorageUtil = {
    /**
     * Default settings used as fallback
     */
    defaultSettings: defaultSettings,

    /**
     * Builds the defaults-only result for a chrome.storage `keys` argument,
     * mirroring chrome's own key semantics. This used to be a bare
     * `{ ...defaults, ...keys }`, which is wrong for the most common form:
     * `typeof [] === 'object'`, so an array of key *names* was spread
     * positionally and `['format','theme']` returned every default plus
     * `{0:'format', 1:'theme'}`.
     * @param {string|string[]|object|null} keys
     * @returns {object} defaults for exactly the requested keys
     */
    defaultsFor(keys) {
        // null/undefined means "everything", same as chrome.storage.
        if (keys === null || keys === undefined) {
            return { ...defaultSettings };
        }
        if (typeof keys === 'string') {
            return { [keys]: defaultSettings[keys] };
        }
        if (Array.isArray(keys)) {
            return keys.reduce((acc, key) => {
                acc[key] = defaultSettings[key];
                return acc;
            }, {});
        }
        // Object form: values are the caller's own defaults, which win over
        // ours because that is what chrome.storage.get(object) promises — but
        // an explicit `undefined` is not a default, so ours still applies.
        const result = this.defaultsFor(Object.keys(keys));
        for (const [key, value] of Object.entries(keys)) {
            if (value !== undefined) result[key] = value;
        }
        return result;
    },

    /**
     * Sets a value in storage with fallback to local storage
     * @param {string|object} key - The key to set, or an object containing multiple key-value pairs
     * @param {any} value - The value to set (not used if key is an object)
     * @param {number} retries - Number of retry attempts
     * @returns {Promise<boolean>} - Success status
     */
    async setWithFallback(key, value, retries = 3) {
        const data = typeof key === 'object' ? key : { [key]: value };
        
        for (let i = 0; i < retries; i++) {
            try {
                await new Promise((resolve, reject) => {
                    chrome.storage.sync.set(data, () => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve();
                        }
                    });
                });
                return true;
            } catch (error) {
                console.warn(`Storage set attempt ${i + 1} failed:`, error);
                
                if (i === retries - 1) {
                    // Final attempt: try local storage
                    try {
                        await new Promise((resolve, reject) => {
                            chrome.storage.local.set(data, () => {
                                if (chrome.runtime.lastError) {
                                    reject(chrome.runtime.lastError);
                                } else {
                                    resolve();
                                }
                            });
                        });
                        return true;
                    } catch (localError) {
                        console.error('Both sync and local storage failed:', localError);
                        return false;
                    }
                }
                
                // Wait with exponential backoff before retrying
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
            }
        }
        return false;
    },

    /**
     * Gets a value from storage with fallback to local storage
     * @param {string|string[]|object} keys - Key(s) to get
     * @param {number} retries - Number of retry attempts
     * @returns {Promise<object>} - Retrieved data or defaults
     */
    async getWithFallback(keys, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const result = await new Promise((resolve, reject) => {
                    chrome.storage.sync.get(keys, (result) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(result);
                        }
                    });
                });
                return result;
            } catch (error) {
                console.warn(`Storage get attempt ${i + 1} failed:`, error);
                
                if (i === retries - 1) {
                    // Final attempt: try local storage
                    try {
                        const localResult = await new Promise((resolve, reject) => {
                            chrome.storage.local.get(keys, (result) => {
                                if (chrome.runtime.lastError) {
                                    reject(chrome.runtime.lastError);
                                } else {
                                    resolve(result);
                                }
                            });
                        });
                        return localResult;
                    } catch (localError) {
                        console.error('Both sync and local storage failed:', localError);
                        // Return defaults if both storages fail
                        return this.defaultsFor(keys);
                    }
                }
                
                // Wait with exponential backoff before retrying
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
            }
        }
        return this.defaultsFor(keys);
    },

    /**
     * Checks the health of both sync and local storage
     * @returns {Promise<object>} Health status of both storage types
     */
    async checkHealth() {
        const testKey = '__health_check__';
        const testValue = { timestamp: Date.now() };
        const status = {
            sync: { working: false, error: null },
            local: { working: false, error: null }
        };

        // Test sync storage
        try {
            await new Promise((resolve, reject) => {
                chrome.storage.sync.set({ [testKey]: testValue }, () => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve();
                });
            });
            const syncResult = await new Promise((resolve, reject) => {
                chrome.storage.sync.get(testKey, (result) => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve(result);
                });
            });
            status.sync.working = JSON.stringify(syncResult[testKey]) === JSON.stringify(testValue);
        } catch (error) {
            status.sync.error = error.message;
        }

        // Test local storage
        try {
            await new Promise((resolve, reject) => {
                chrome.storage.local.set({ [testKey]: testValue }, () => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve();
                });
            });
            const localResult = await new Promise((resolve, reject) => {
                chrome.storage.local.get(testKey, (result) => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve(result);
                });
            });
            status.local.working = JSON.stringify(localResult[testKey]) === JSON.stringify(testValue);
        } catch (error) {
            status.local.error = error.message;
        }

        // Cleanup test key
        try {
            await Promise.all([
                new Promise(resolve => chrome.storage.sync.remove(testKey, resolve)),
                new Promise(resolve => chrome.storage.local.remove(testKey, resolve))
            ]);
        } catch (error) {
            console.warn('Failed to cleanup health check keys:', error);
        }

        return status;
    },

    /**
     * Repairs storage by clearing corrupted data and restoring defaults
     * @returns {Promise<boolean>} Success status
     */
    async repair() {
        try {
            // Clear both storages
            await Promise.all([
                new Promise((resolve, reject) => {
                    chrome.storage.sync.clear(() => {
                        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                        else resolve();
                    });
                }),
                new Promise((resolve, reject) => {
                    chrome.storage.local.clear(() => {
                        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                        else resolve();
                    });
                })
            ]);

            // Restore defaults to both storages
            await Promise.all([
                this.setWithFallback(this.defaultSettings, null, 1),
                new Promise((resolve, reject) => {
                    chrome.storage.local.set(this.defaultSettings, () => {
                        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                        else resolve();
                    });
                })
            ]);

            return true;
        } catch (error) {
            console.error('Storage repair failed:', error);
            return false;
        }
    }
};

// Make StorageUtil available globally. Use globalThis, not window: `window` is
// undefined in a service worker and would throw a ReferenceError if this file
// were ever pulled in via importScripts.
globalThis.StorageUtil = StorageUtil;
