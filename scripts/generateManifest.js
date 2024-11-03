const fs = require('fs');
require('dotenv').config();

const generateManifest = (outputPath = 'public') => {
  const manifest = {
    name: process.env.APP_NAME || 'Basura Cero',
    short_name: process.env.APP_NAME || 'BasuraCero',
    description: process.env.APP_DESCRIPTION || 'Sistema colaborativo de incidencias urbanas',
    start_url: "/",
    display: "standalone",
    background_color: process.env.APP_BACKGROUND_COLOR || "#ffffff",
    theme_color: process.env.APP_PRIMARY_COLOR || "#4b3481",
    icons: [
      {
        src: process.env.APP_FAVICON_PATH || "/img/default/favicon.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: process.env.APP_FAVICON_PATH || "/img/default/favicon.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };

  fs.writeFileSync(
    `${outputPath}/manifest.json`,
    JSON.stringify(manifest, null, 2)
  );
};

// Si el script se ejecuta directamente
if (require.main === module) {
  const outputPath = process.argv[2] || 'dist';
  generateManifest(outputPath);
}

module.exports = generateManifest;