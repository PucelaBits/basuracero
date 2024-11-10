const Papa = require('papaparse');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:5050';

function getFullImageUrl(path) {
  if (!path) return '';
  return path.startsWith('http') ? path : `${BASE_URL}${path}`;
}

function toCSV(incidencias) {
  const maxImages = incidencias.reduce((max, item) => 
    Math.max(max, (item.imagenes?.length || 0)), 0);
  
  const processedData = incidencias.map(item => {
    const processed = { 
      id: item.id,
      tipo: item.tipo,
      descripcion: item.descripcion,
      latitud: item.latitud,
      longitud: item.longitud,
      nombre: item.nombre,
      fecha: item.fecha,
      estado: item.estado,
      direccion: item.direccion,
      reportes_solucion: item.reportes_solucion,
      reportes_inadecuado: item.reportes_inadecuado,
      ...item.direccion_completa,
    };
    
    for (let i = 0; i < maxImages; i++) {
      processed[`imagen_${i + 1}`] = getFullImageUrl(item.imagenes?.[i]?.ruta_imagen || '');
    }
    
    return processed;
  });
  
  return Papa.unparse(processedData, {
    quotes: true,
    delimiter: ',',
    header: true
  });
}

function toGeoJSON(incidencias) {
  return {
    type: "FeatureCollection",
    features: incidencias.map(inc => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [parseFloat(inc.longitud), parseFloat(inc.latitud)]
      },
      properties: {
        id: inc.id,
        tipo: inc.tipo,
        descripcion: inc.descripcion,
        nombre: inc.nombre,
        fecha: inc.fecha,
        estado: inc.estado,
        direccion: inc.direccion,
        direccion_completa: inc.direccion_completa,
        reportes_solucion: inc.reportes_solucion,
        reportes_inadecuado: inc.reportes_inadecuado,
        imagenes: inc.imagenes?.map(img => getFullImageUrl(img.ruta_imagen)) || [],
        "marker-symbol": "marker",
        "marker-color": inc.estado === 'activa' ? "#c30b82" : "#27ae60",
        "marker-size": "medium",
        "image": getFullImageUrl(inc.imagenes?.[0]?.ruta_imagen) || null
      }
    }))
  };
}

module.exports = { toCSV, toGeoJSON };