const express = require('express');
const cors = require('cors');
const path = require('path');
const incidenciasRoutes = require('./routes/incidencias');

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'uploads'
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));

// Servir archivos estáticos de la aplicación Vue
app.use(express.static(path.join(__dirname, '..', '..', 'dist')));

app.use('/api/incidencias', incidenciasRoutes);

// Manejar todas las demás rutas y servir index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});