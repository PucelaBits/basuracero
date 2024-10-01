const express = require('express');
const cors = require('cors');
const path = require('path');
const incidenciasRoutes = require('./routes/incidencias');
const rssRoutes = require('./routes/rss');

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'uploads'
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));

// Servir archivos estáticos de la aplicación Vue
app.use(express.static(path.join(__dirname, '..', '..', 'dist')));

app.use('/api/incidencias', incidenciasRoutes);
app.use('/api/rss', rssRoutes);

// Manejar rutas de incidencias individuales
app.get('/incidencia/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const incidencia = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM incidencias WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!incidencia) {
      return res.status(404).send('Incidencia no encontrada');
    }

    let indexHtml = await fs.promises.readFile(path.join(__dirname, '..', '..', 'dist', 'index.html'), 'utf8');

    const title = `Basura Cero - Incidencia ${incidencia.id}`;
    const description = incidencia.descripcion || 'Detalles de la incidencia en Basura Cero';
    const imageUrl = incidencia.imagenes && incidencia.imagenes.length > 0 
      ? `https://basuracero.pucelabits.org/uploads/${incidencia.imagenes[0].ruta_imagen}` 
      : 'https://basuracero.pucelabits.org/favicon.png';
    const url = `https://basuracero.pucelabits.org/incidencia/${incidencia.id}`;

    // Actualizar los metadatos
    const metadataUpdates = [
      { tag: 'title', content: title },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: imageUrl },
      { property: 'og:url', content: url },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: imageUrl },
      { name: 'twitter:url', content: url },
    ];

    metadataUpdates.forEach(update => {
      const regex = update.tag 
        ? new RegExp(`<${update.tag}>.*?</${update.tag}>`)
        : new RegExp(`<meta (property|name)="${update.property || update.name}".*?>`);
      
      const replacement = update.tag
        ? `<${update.tag}>${update.content}</${update.tag}>`
        : `<meta ${update.property ? 'property' : 'name'}="${update.property || update.name}" content="${update.content}">`;
      
      indexHtml = indexHtml.replace(regex, replacement);
    });

    res.send(indexHtml);
  } catch (error) {
    console.error('Error al obtener la incidencia:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// Manejar todas las demás rutas y servir index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});