/**
 * Utilidad para convertir errores técnicos en mensajes amigables para el usuario
 * Estos mensajes están diseñados para ser claros y comprensibles sin jerga técnica
 */

const errorMessages = {
  // Errores de base de datos
  database: {
    connection: 'No pudimos conectar con nuestra base de datos. Por favor, inténtalo de nuevo en unos minutos.',
    timeout: 'La operación está tardando más de lo esperado. Por favor, inténtalo de nuevo.',
    generic: 'Hay un problema temporal con nuestro sistema. Por favor, inténtalo de nuevo más tarde.'
  },
  
  // Errores de validación
  validation: {
    required: 'Este campo es obligatorio.',
    tooLong: 'El texto introducido es demasiado largo.',
    tooShort: 'El texto introducido es demasiado corto.',
    invalidFormat: 'El formato introducido no es válido.',
    outOfBounds: 'La ubicación seleccionada está fuera de la zona permitida.',
    invalidCoordinates: 'Las coordenadas introducidas no son válidas.',
    nameInvalid: 'El nombre solo puede contener letras, números y espacios.'
  },
  
  // Errores de archivos/imágenes
  file: {
    tooLarge: 'La imagen seleccionada es demasiado grande. Por favor, elige una imagen más pequeña.',
    invalidType: 'El tipo de archivo no es válido. Por favor, selecciona una imagen (JPG, PNG).',
    processingError: 'No pudimos procesar la imagen. Por favor, inténtalo con otra imagen.',
    uploadError: 'Hubo un problema al subir la imagen. Por favor, inténtalo de nuevo.',
    noFiles: 'No se han seleccionado archivos.',
    noImage: 'Por favor, añade al menos una imagen para reportar la incidencia.'
  },
  
  // Errores de captcha
  captcha: {
    invalid: 'Por favor, completa la verificación de seguridad.',
    expired: 'La verificación de seguridad ha caducado. Por favor, inténtalo de nuevo.',
    failed: 'No se pudo verificar que eres una persona real. Por favor, inténtalo de nuevo.'
  },
  
  // Errores de red/conectividad
  network: {
    timeout: 'La conexión está tardando más de lo esperado. Por favor, verifica tu conexión a internet.',
    offline: 'Parece que no tienes conexión a internet. Por favor, verifica tu conexión.',
    serverError: 'Nuestros servidores están experimentando problemas temporales. Por favor, inténtalo de nuevo en unos minutos.'
  },
  
  // Errores de autorización/permisos
  auth: {
    unauthorized: 'No tienes permisos para realizar esta acción.',
    forbidden: 'Esta acción no está permitida.',
    sessionExpired: 'Tu sesión ha caducado. Por favor, recarga la página.'
  },
  
  // Errores específicos de incidencias
  incidencia: {
    notFound: 'No pudimos encontrar la incidencia solicitada.',
    alreadyExists: 'Ya existe una incidencia similar muy cerca de esta ubicación.',
    tooMany: 'Has creado demasiadas incidencias recientemente. Por favor, espera un poco antes de crear otra.',
    invalidState: 'Esta incidencia no se puede modificar en su estado actual.',
    duplicateReport: 'Ya has reportado esta incidencia anteriormente.'
  },
  
  // Errores de geolocalización
  location: {
    permissionDenied: 'Necesitamos tu permiso para acceder a tu ubicación. Por favor, permite el acceso a la ubicación en tu navegador.',
    unavailable: 'No pudimos obtener tu ubicación actual. Por favor, inténtalo de nuevo o selecciona la ubicación en el mapa.',
    timeout: 'La búsqueda de ubicación está tardando demasiado. Por favor, inténtalo de nuevo.',
    notSupported: 'Tu navegador no es compatible con la geolocalización. Por favor, selecciona la ubicación en el mapa.'
  }
};

/**
 * Convierte errores técnicos en mensajes amigables para el usuario
 * @param {Error|string} error - El error técnico o mensaje de error
 * @param {string} context - El contexto donde ocurrió el error (opcional)
 * @returns {string} Mensaje amigable para el usuario
 */
function getAmigableErrorMessage(error, context = 'general') {
  // Si ya es un mensaje amigable, lo devolvemos tal como está
  if (typeof error === 'string' && !isTechy(error)) {
    return error;
  }
  
  const errorMessage = typeof error === 'string' ? error : error?.message || '';
  const errorCode = error?.code || '';
  
  // Errores de base de datos SQLite
  if (errorMessage.includes('SQLITE_') || errorCode.startsWith('SQLITE_')) {
    if (errorMessage.includes('BUSY') || errorCode === 'SQLITE_BUSY') {
      return errorMessages.database.timeout;
    }
    if (errorMessage.includes('CONSTRAINT') || errorCode === 'SQLITE_CONSTRAINT') {
      return 'Los datos introducidos no son válidos. Por favor, revisa la información e inténtalo de nuevo.';
    }
    return errorMessages.database.generic;
  }
  
  // Errores de conexión
  if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('ETIMEDOUT')) {
    return errorMessages.network.serverError;
  }
  
  // Errores de validación conocidos
  if (errorMessage.includes('validation') || errorMessage.includes('required')) {
    return errorMessages.validation.required;
  }
  
  if (errorMessage.includes('too long') || errorMessage.includes('exceed')) {
    return errorMessages.validation.tooLong;
  }
  
  if (errorMessage.includes('invalid') && errorMessage.includes('coordinate')) {
    return errorMessages.validation.invalidCoordinates;
  }
  
  if (errorMessage.includes('out of bounds') || errorMessage.includes('fuera de los límites')) {
    return errorMessages.validation.outOfBounds;
  }
  
  // Errores de archivos
  if (errorMessage.includes('file') || errorMessage.includes('image') || errorMessage.includes('upload')) {
    if (errorMessage.includes('size') || errorMessage.includes('large')) {
      return errorMessages.file.tooLarge;
    }
    if (errorMessage.includes('type') || errorMessage.includes('format')) {
      return errorMessages.file.invalidType;
    }
    return errorMessages.file.uploadError;
  }
  
  // Errores de captcha
  if (errorMessage.includes('captcha') || errorMessage.includes('Captcha')) {
    return errorMessages.captcha.invalid;
  }
  
  // Errores de rate limiting
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
    return 'Has realizado demasiadas acciones muy rápido. Por favor, espera un momento antes de intentarlo de nuevo.';
  }
  
  // Errores HTTP específicos
  if (error?.status || error?.response?.status) {
    const status = error.status || error.response.status;
    switch (status) {
      case 400:
        return 'Los datos enviados no son válidos. Por favor, revisa la información e inténtalo de nuevo.';
      case 401:
        return errorMessages.auth.unauthorized;
      case 403:
        return errorMessages.auth.forbidden;
      case 404:
        return 'No pudimos encontrar lo que buscas. Por favor, verifica e inténtalo de nuevo.';
      case 408:
        return errorMessages.network.timeout;
      case 413:
        return 'Los datos enviados son demasiado grandes. Por favor, reduce el tamaño de las imágenes.';
      case 429:
        return 'Has realizado demasiadas solicitudes. Por favor, espera un momento antes de intentarlo de nuevo.';
      case 500:
      case 502:
      case 503:
      case 504:
        return errorMessages.network.serverError;
    }
  }
  
  // Si no podemos clasificar el error, devolvemos un mensaje genérico amigable
  return 'Ha ocurrido un problema inesperado. Por favor, inténtalo de nuevo. Si el problema persiste, puedes reportárnoslo.';
}

/**
 * Verifica si un mensaje parece técnico (contiene jerga de programación)
 * @param {string} message - El mensaje a verificar
 * @returns {boolean} True si parece técnico
 */
function isTechy(message) {
  const techyWords = [
    'null', 'undefined', 'function', 'object', 'array',
    'SQLITE_', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND',
    'stack trace', 'exception', 'TypeError', 'ReferenceError',
    'SyntaxError', 'Error:', 'at line', 'at Object',
    'console.error', 'Promise', 'async', 'await',
    'JSON.parse', 'JSON.stringify', 'parseInt', 'parseFloat'
  ];
  
  return techyWords.some(word => message.includes(word));
}

/**
 * Obtiene un mensaje específico de error por categoría y tipo
 * @param {string} category - La categoría del error
 * @param {string} type - El tipo específico de error
 * @returns {string} El mensaje de error amigable
 */
function getSpecificErrorMessage(category, type) {
  return errorMessages[category]?.[type] || getAmigableErrorMessage('Error desconocido');
}

module.exports = {
  errorMessages,
  getAmigableErrorMessage,
  getSpecificErrorMessage,
  isTechy
};
