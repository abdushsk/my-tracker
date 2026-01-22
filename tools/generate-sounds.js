/**
 * Sound Effect Generator for My Tracker
 *
 * This script generates simple WAV sound effects for the Chrome extension.
 * No external dependencies required - uses pure Node.js.
 *
 * Usage: node tools/generate-sounds.js
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const SOUNDS_DIR = path.join(__dirname, '..', 'src', 'assets', 'sounds');

/**
 * Create a WAV file buffer from raw PCM audio data
 * @param {Float32Array} samples - Audio samples (-1 to 1)
 * @returns {Buffer} WAV file buffer
 */
function createWavBuffer(samples) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = SAMPLE_RATE * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const fileSize = 44 + dataSize - 8;

  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, offset); offset += 2; // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(SAMPLE_RATE, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // Write audio samples as 16-bit PCM
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const intSample = Math.round(sample * 32767);
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  return buffer;
}

/**
 * Generate a sine wave tone
 * @param {number} frequency - Frequency in Hz
 * @param {number} duration - Duration in seconds
 * @param {number} volume - Volume (0-1)
 * @returns {Float32Array} Audio samples
 */
function generateSineWave(frequency, duration, volume = 0.5) {
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = Math.sin(2 * Math.PI * frequency * t) * volume;
  }

  return samples;
}

/**
 * Apply an envelope (fade in/out) to audio samples
 * @param {Float32Array} samples - Audio samples
 * @param {number} attackTime - Fade in time (seconds)
 * @param {number} releaseTime - Fade out time (seconds)
 * @returns {Float32Array} Processed samples
 */
function applyEnvelope(samples, attackTime, releaseTime) {
  const attackSamples = Math.floor(SAMPLE_RATE * attackTime);
  const releaseSamples = Math.floor(SAMPLE_RATE * releaseTime);
  const result = new Float32Array(samples.length);

  for (let i = 0; i < samples.length; i++) {
    let envelope = 1;

    // Attack (fade in)
    if (i < attackSamples) {
      envelope = i / attackSamples;
    }

    // Release (fade out)
    const releaseStart = samples.length - releaseSamples;
    if (i > releaseStart) {
      envelope = (samples.length - i) / releaseSamples;
    }

    result[i] = samples[i] * envelope;
  }

  return result;
}

/**
 * Mix multiple audio samples together
 * @param  {...Float32Array} sampleArrays - Arrays of samples to mix
 * @returns {Float32Array} Mixed samples
 */
function mixSamples(...sampleArrays) {
  const maxLength = Math.max(...sampleArrays.map(s => s.length));
  const result = new Float32Array(maxLength);

  for (const samples of sampleArrays) {
    for (let i = 0; i < samples.length; i++) {
      result[i] += samples[i] / sampleArrays.length;
    }
  }

  return result;
}

/**
 * Concatenate audio samples with optional gap
 * @param {Float32Array[]} sampleArrays - Arrays to concatenate
 * @param {number} gapSeconds - Gap between segments in seconds
 * @returns {Float32Array} Concatenated samples
 */
function concatenateSamples(sampleArrays, gapSeconds = 0) {
  const gapSamples = Math.floor(SAMPLE_RATE * gapSeconds);
  const totalLength = sampleArrays.reduce((sum, s) => sum + s.length, 0) +
                      gapSamples * (sampleArrays.length - 1);
  const result = new Float32Array(totalLength);

  let offset = 0;
  for (let i = 0; i < sampleArrays.length; i++) {
    result.set(sampleArrays[i], offset);
    offset += sampleArrays[i].length;
    if (i < sampleArrays.length - 1) {
      offset += gapSamples;
    }
  }

  return result;
}

/**
 * Generate a "complete" celebration chime sound
 * A pleasant two-note rising chime
 */
function generateCompleteSound() {
  // Two rising notes: C5 (523Hz) -> E5 (659Hz)
  const note1 = applyEnvelope(generateSineWave(523, 0.15, 0.6), 0.01, 0.1);
  const note2 = applyEnvelope(generateSineWave(659, 0.2, 0.6), 0.01, 0.15);

  // Add harmonics for richer sound
  const note1Harmonic = applyEnvelope(generateSineWave(1046, 0.15, 0.2), 0.01, 0.1);
  const note2Harmonic = applyEnvelope(generateSineWave(1318, 0.2, 0.2), 0.01, 0.15);

  const richNote1 = mixSamples(note1, note1Harmonic);
  const richNote2 = mixSamples(note2, note2Harmonic);

  return concatenateSamples([richNote1, richNote2], 0.05);
}

/**
 * Generate a soft "tick" sound for counter/checkbox interactions
 * A short, subtle click
 */
function generateTickSound() {
  // Short click at ~800Hz with quick decay
  const click = applyEnvelope(generateSineWave(800, 0.05, 0.4), 0.002, 0.04);

  // Add a subtle lower tone for body
  const body = applyEnvelope(generateSineWave(400, 0.03, 0.15), 0.001, 0.025);

  return mixSamples(click, body);
}

/**
 * Generate a "start" tone for timer play
 * A gentle rising tone
 */
function generateStartSound() {
  // Rising frequency sweep from ~400Hz to ~600Hz
  const duration = 0.15;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / numSamples;
    // Frequency sweep from 400 to 600 Hz
    const freq = 400 + (200 * progress);
    samples[i] = Math.sin(2 * Math.PI * freq * t) * 0.4;
  }

  return applyEnvelope(samples, 0.01, 0.08);
}

/**
 * Generate a "pause" sound for timer pause
 * A gentle falling tone
 */
function generatePauseSound() {
  // Falling frequency sweep from ~600Hz to ~400Hz
  const duration = 0.12;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / numSamples;
    // Frequency sweep from 600 to 400 Hz
    const freq = 600 - (200 * progress);
    samples[i] = Math.sin(2 * Math.PI * freq * t) * 0.35;
  }

  return applyEnvelope(samples, 0.01, 0.08);
}

/**
 * Save a WAV file
 * @param {string} filename - Output filename (without extension)
 * @param {Float32Array} samples - Audio samples
 */
function saveWavFile(filename, samples) {
  const wavBuffer = createWavBuffer(samples);
  const filepath = path.join(SOUNDS_DIR, `${filename}.wav`);
  fs.writeFileSync(filepath, wavBuffer);

  const sizeKB = (wavBuffer.length / 1024).toFixed(2);
  console.log(`Created ${filename}.wav (${sizeKB} KB)`);
}

// Main execution
console.log('Generating sound effects...\n');

// Ensure sounds directory exists
if (!fs.existsSync(SOUNDS_DIR)) {
  fs.mkdirSync(SOUNDS_DIR, { recursive: true });
}

// Generate and save all sounds
saveWavFile('complete', generateCompleteSound());
saveWavFile('tick', generateTickSound());
saveWavFile('start', generateStartSound());
saveWavFile('pause', generatePauseSound());

console.log('\nAll sound effects generated successfully!');
console.log(`Files saved to: ${SOUNDS_DIR}`);
