/**
 * Sound Utility Module
 * US-037: Audio utility for playing sound effects
 *
 * Uses HTMLAudioElement for cross-browser compatibility.
 * Falls back gracefully if audio playback fails.
 */

// =============================================================================
// Sound Configuration
// =============================================================================

/**
 * Available sound names
 * @readonly
 * @enum {string}
 */
export const SOUNDS = {
  COMPLETE: 'complete',    // Goal completion celebration chime
  TICK: 'tick',           // Counter increment/decrement, checkbox toggle
  START: 'start',         // Timer start
  PAUSE: 'pause',         // Timer pause
  CLICK: 'tick',          // UI click feedback (alias for tick)
  ACHIEVEMENT: 'complete' // Achievement unlock (alias for complete)
};

/**
 * Sound file paths relative to the extension root
 * Using WAV format for broad browser compatibility without external encoding
 * @type {Object.<string, string>}
 */
const SOUND_PATHS = {
  [SOUNDS.COMPLETE]: 'src/assets/sounds/complete.wav',
  [SOUNDS.TICK]: 'src/assets/sounds/tick.wav',
  [SOUNDS.START]: 'src/assets/sounds/start.wav',
  [SOUNDS.PAUSE]: 'src/assets/sounds/pause.wav'
};

// =============================================================================
// State
// =============================================================================

/**
 * Audio state
 * @type {Object}
 */
const audioState = {
  /** @type {number} Volume level 0-1 */
  volume: 0.5,
  /** @type {boolean} Whether audio is muted */
  isMuted: false,
  /** @type {Object.<string, HTMLAudioElement>} Cached audio elements */
  audioCache: {},
  /** @type {boolean} Whether audio is initialized */
  initialized: false
};

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize the audio system
 * Pre-loads sounds for faster playback
 * @returns {Promise<void>}
 */
export async function initSounds() {
  if (audioState.initialized) {
    return;
  }

  try {
    // Pre-create audio elements for each sound
    for (const [soundName, path] of Object.entries(SOUND_PATHS)) {
      const audio = new Audio();
      audio.preload = 'auto';

      // Get the extension URL for the sound file
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        audio.src = chrome.runtime.getURL(path);
      } else {
        // Fallback for testing or non-extension environment
        audio.src = '/' + path;
      }

      audioState.audioCache[soundName] = audio;
    }

    audioState.initialized = true;
    console.log('[Sound] Audio system initialized');
  } catch (error) {
    console.error('[Sound] Failed to initialize audio system:', error);
  }
}

// =============================================================================
// Playback Functions
// =============================================================================

/**
 * Play a sound effect
 * @param {string} soundName - The name of the sound to play (from SOUNDS enum)
 * @returns {Promise<boolean>} Whether the sound played successfully
 */
export async function playSound(soundName) {
  // Validate sound name
  if (!Object.values(SOUNDS).includes(soundName)) {
    console.warn(`[Sound] Unknown sound name: ${soundName}`);
    return false;
  }

  // Don't play if muted
  if (audioState.isMuted) {
    console.log(`[Sound] Sound muted, skipping: ${soundName}`);
    return false;
  }

  try {
    // Initialize if needed
    if (!audioState.initialized) {
      await initSounds();
    }

    // Get or create the audio element
    let audio = audioState.audioCache[soundName];

    if (!audio) {
      // Create new audio element if not cached
      audio = new Audio();
      const path = SOUND_PATHS[soundName];

      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        audio.src = chrome.runtime.getURL(path);
      } else {
        audio.src = '/' + path;
      }

      audioState.audioCache[soundName] = audio;
    }

    // Reset audio to start if it's still playing
    audio.currentTime = 0;
    audio.volume = audioState.volume;

    // Play the sound
    await audio.play();
    console.log(`[Sound] Played: ${soundName}`);
    return true;
  } catch (error) {
    // Gracefully handle playback failures
    // This can happen due to browser autoplay policies
    console.warn(`[Sound] Failed to play ${soundName}:`, error.message);
    return false;
  }
}

/**
 * Play sound for a specific goal event
 * Convenience function that maps events to sounds
 * @param {string} eventType - The type of event ('complete', 'timerStart', 'timerPause', 'tick')
 * @returns {Promise<boolean>} Whether the sound played successfully
 */
export async function playSoundForEvent(eventType) {
  const soundMap = {
    'complete': SOUNDS.COMPLETE,
    'timerStart': SOUNDS.START,
    'timerPause': SOUNDS.PAUSE,
    'tick': SOUNDS.TICK,
    'increment': SOUNDS.TICK,
    'decrement': SOUNDS.TICK,
    'toggle': SOUNDS.TICK
  };

  const soundName = soundMap[eventType];
  if (!soundName) {
    console.warn(`[Sound] Unknown event type: ${eventType}`);
    return false;
  }

  return playSound(soundName);
}

// =============================================================================
// Volume Control
// =============================================================================

/**
 * Set the volume level
 * @param {number} level - Volume level between 0 and 1
 * @returns {boolean} Whether the volume was set successfully
 */
export function setVolume(level) {
  // Validate input
  if (typeof level !== 'number' || isNaN(level)) {
    console.warn('[Sound] Invalid volume level:', level);
    return false;
  }

  // Clamp to valid range
  const clampedLevel = Math.max(0, Math.min(1, level));
  audioState.volume = clampedLevel;

  // Update volume on cached audio elements
  for (const audio of Object.values(audioState.audioCache)) {
    audio.volume = clampedLevel;
  }

  console.log(`[Sound] Volume set to: ${clampedLevel}`);
  return true;
}

/**
 * Get the current volume level
 * @returns {number} Current volume level (0-1)
 */
export function getVolume() {
  return audioState.volume;
}

// =============================================================================
// Mute Control
// =============================================================================

/**
 * Set the muted state
 * @param {boolean} muted - Whether to mute audio
 * @returns {boolean} The new muted state
 */
export function setMuted(muted) {
  audioState.isMuted = Boolean(muted);
  console.log(`[Sound] Muted: ${audioState.isMuted}`);
  return audioState.isMuted;
}

/**
 * Get the current muted state
 * @returns {boolean} Whether audio is muted
 */
export function isMuted() {
  return audioState.isMuted;
}

/**
 * Toggle the muted state
 * @returns {boolean} The new muted state
 */
export function toggleMuted() {
  audioState.isMuted = !audioState.isMuted;
  console.log(`[Sound] Muted toggled to: ${audioState.isMuted}`);
  return audioState.isMuted;
}

// =============================================================================
// Settings Integration
// =============================================================================

/**
 * Load sound settings from storage
 * @param {Object} settings - Settings object with soundEnabled and soundVolume properties
 */
export function loadSoundSettings(settings) {
  if (settings) {
    if (typeof settings.soundEnabled === 'boolean') {
      // soundEnabled = true means NOT muted
      setMuted(!settings.soundEnabled);
    }
    if (typeof settings.soundVolume === 'number') {
      // Convert from 0-100 range to 0-1 range
      setVolume(settings.soundVolume / 100);
    }
  }
}

/**
 * Get current sound settings for storage
 * @returns {Object} Settings object with soundEnabled and soundVolume
 */
export function getSoundSettings() {
  return {
    soundEnabled: !audioState.isMuted,
    soundVolume: Math.round(audioState.volume * 100)
  };
}

// =============================================================================
// Cleanup
// =============================================================================

/**
 * Clean up audio resources
 * Call this when the popup is closing
 */
export function cleanupSounds() {
  // Stop any playing sounds and release resources
  for (const audio of Object.values(audioState.audioCache)) {
    audio.pause();
    audio.src = '';
  }
  audioState.audioCache = {};
  audioState.initialized = false;
  console.log('[Sound] Audio system cleaned up');
}

// =============================================================================
// Test/Debug Helper
// =============================================================================

/**
 * Test all sounds (for debugging)
 * @returns {Promise<void>}
 */
export async function testAllSounds() {
  console.log('[Sound] Testing all sounds...');

  for (const soundName of Object.values(SOUNDS)) {
    console.log(`[Sound] Testing: ${soundName}`);
    await playSound(soundName);
    // Small delay between sounds
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('[Sound] Sound test complete');
}
