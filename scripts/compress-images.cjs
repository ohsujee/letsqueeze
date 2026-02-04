const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '../public/images');
const OUTPUT_DIR = path.join(__dirname, '../public/images/optimized');

// Images à compresser
const IMAGES = [
  'quiz-buzzer.png',
  'alibi.png',
  'blind-test.png',
  'mime-game.png',
  'laregle.png',
  'memory.png',
];

async function compressImages() {
  // Créer le dossier de sortie
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const image of IMAGES) {
    const inputPath = path.join(IMAGES_DIR, image);
    const outputName = image.replace('.png', '.webp');
    const outputPath = path.join(OUTPUT_DIR, outputName);

    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  ${image} not found, skipping...`);
      continue;
    }

    const inputStats = fs.statSync(inputPath);
    const inputSizeKB = (inputStats.size / 1024).toFixed(0);

    try {
      await sharp(inputPath)
        .resize(800, null, { // Max 800px de large, hauteur auto
          withoutEnlargement: true,
          fit: 'inside'
        })
        .webp({
          quality: 80,
          effort: 6
        })
        .toFile(outputPath);

      const outputStats = fs.statSync(outputPath);
      const outputSizeKB = (outputStats.size / 1024).toFixed(0);
      const reduction = (100 - (outputStats.size / inputStats.size * 100)).toFixed(1);

      console.log(`✅ ${image}: ${inputSizeKB}KB → ${outputSizeKB}KB (${reduction}% smaller)`);
    } catch (err) {
      console.error(`❌ Error compressing ${image}:`, err.message);
    }
  }

  console.log('\n📁 Compressed images saved to: public/images/optimized/');
  console.log('📝 Update games.js to use the new .webp paths');
}

compressImages();
