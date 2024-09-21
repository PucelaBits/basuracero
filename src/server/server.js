const express = require('express');
const cors = require('cors');
const path = require('path');
const incidenciasRoutes = require('./routes/incidencias');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'uploads'
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));

app.use('/api/incidencias', incidenciasRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});