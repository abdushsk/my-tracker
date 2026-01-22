/**
 * Simple PNG Icon Generator for My Tracker
 * Creates basic colored circle icons with checkmarks
 *
 * This script generates PNG icons without external dependencies.
 * It creates a simple green circle with a white checkmark.
 */

const fs = require('fs');
const path = require('path');

// PNG file signature
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

// CRC32 lookup table
const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[n] = c;
    }
    return table;
})();

function crc32(data) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crcValue = crc32(crcData);

    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crcValue, 0);

    return Buffer.concat([length, typeBuffer, data, crc]);
}

function createIHDR(width, height) {
    const data = Buffer.alloc(13);
    data.writeUInt32BE(width, 0);      // Width
    data.writeUInt32BE(height, 4);     // Height
    data.writeUInt8(8, 8);             // Bit depth
    data.writeUInt8(6, 9);             // Color type (RGBA)
    data.writeUInt8(0, 10);            // Compression method
    data.writeUInt8(0, 11);            // Filter method
    data.writeUInt8(0, 12);            // Interlace method
    return createChunk('IHDR', data);
}

function createIDAT(rawData) {
    const { deflateSync } = require('zlib');
    const compressed = deflateSync(rawData, { level: 9 });
    return createChunk('IDAT', compressed);
}

function createIEND() {
    return createChunk('IEND', Buffer.alloc(0));
}

function drawCircle(pixels, width, height, cx, cy, radius, r, g, b, a = 255) {
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= radius) {
                const idx = (y * width + x) * 4;
                // Anti-aliasing at edges
                const alpha = Math.min(1, radius - dist + 0.5);
                const blendAlpha = Math.round(a * alpha);

                // Simple alpha blending
                const existingAlpha = pixels[idx + 3];
                if (existingAlpha > 0) {
                    const blend = blendAlpha / 255;
                    pixels[idx] = Math.round(pixels[idx] * (1 - blend) + r * blend);
                    pixels[idx + 1] = Math.round(pixels[idx + 1] * (1 - blend) + g * blend);
                    pixels[idx + 2] = Math.round(pixels[idx + 2] * (1 - blend) + b * blend);
                    pixels[idx + 3] = Math.max(existingAlpha, blendAlpha);
                } else {
                    pixels[idx] = r;
                    pixels[idx + 1] = g;
                    pixels[idx + 2] = b;
                    pixels[idx + 3] = blendAlpha;
                }
            }
        }
    }
}

function drawLine(pixels, width, height, x1, y1, x2, y2, thickness, r, g, b, a = 255) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(length * 2);

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const cx = x1 + dx * t;
        const cy = y1 + dy * t;
        drawCircle(pixels, width, height, cx, cy, thickness / 2, r, g, b, a);
    }
}

function createIcon(size) {
    const width = size;
    const height = size;
    const scale = size / 128;

    // Initialize pixel buffer with transparency
    const pixels = new Uint8Array(width * height * 4);

    // Draw green circle background
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = (width / 2) - (2 * scale);

    // Green color: #4CAF50
    drawCircle(pixels, width, height, centerX, centerY, radius, 0x4C, 0xAF, 0x50);

    // Draw checkmark (white)
    const checkThickness = Math.max(2, 10 * scale);

    // First part of checkmark: from left to bottom
    const x1 = 38 * scale;
    const y1 = 64 * scale;
    const x2 = 56 * scale;
    const y2 = 82 * scale;

    // Second part of checkmark: from bottom to right
    const x3 = 90 * scale;
    const y3 = 46 * scale;

    drawLine(pixels, width, height, x1, y1, x2, y2, checkThickness, 255, 255, 255);
    drawLine(pixels, width, height, x2, y2, x3, y3, checkThickness, 255, 255, 255);

    // Create raw PNG data with filter bytes
    const rawData = Buffer.alloc(height * (1 + width * 4));
    for (let y = 0; y < height; y++) {
        rawData[y * (1 + width * 4)] = 0; // Filter type: None
        for (let x = 0; x < width; x++) {
            const srcIdx = (y * width + x) * 4;
            const dstIdx = y * (1 + width * 4) + 1 + x * 4;
            rawData[dstIdx] = pixels[srcIdx];
            rawData[dstIdx + 1] = pixels[srcIdx + 1];
            rawData[dstIdx + 2] = pixels[srcIdx + 2];
            rawData[dstIdx + 3] = pixels[srcIdx + 3];
        }
    }

    // Assemble PNG file
    const ihdr = createIHDR(width, height);
    const idat = createIDAT(rawData);
    const iend = createIEND();

    return Buffer.concat([PNG_SIGNATURE, ihdr, idat, iend]);
}

// Generate icons
const iconsDir = path.join(__dirname, '..', 'src', 'assets', 'icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [16, 48, 128];

sizes.forEach(size => {
    const png = createIcon(size);
    const filename = path.join(iconsDir, `icon-${size}.png`);
    fs.writeFileSync(filename, png);
    console.log(`Created: ${filename} (${png.length} bytes)`);
});

console.log('\nAll icons generated successfully!');
