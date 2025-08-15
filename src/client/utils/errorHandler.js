/**
 * Utilidad para manejar errores en el cliente de forma amigable para el usuario
 */

// Mapeo de errores técnicos a mensajes amigables
const clientErrorMessages = {
  // Errores de validación
  validation: {
    required: 'Este campo es obligatorio.',
    maxLength: 'El texto es demasiado largo. Por favor, intenta acortarlo.',
    minLength: 'El texto es demasiado corto.',
    format: 'El formato introducido no es válido.',
    location: 'La ubicación está fuera de la zona permitida.',
    invalidCoordinates: 'Las coordenadas no son válidas.',
    name: 'El nombre solo puede contener letras, números y espacios.'
  },
  
  // Errores de red
  network: {
    offline: 'Parece que no tienes conexión a internet. Por favor, verifica tu conexión y vuelve a intentarlo.',
    timeout: 'La conexión está tardando más de lo esperado. Por favor, inténtalo de nuevo en unos momentos.',
    serverError: 'Hay un problema temporal con nuestros servidores. Por favor, inténtalo de nuevo más tarde.'
  },
  
  // Errores de archivos
  file: {
    size: 'La imagen es demasiado grande. Por favor, usa una imagen más pequeña.',
    type: 'El tipo de archivo no es válido. Por favor, selecciona una imagen.',
    upload: 'No se pudo subir la imagen. Por favor, inténtalo con otra imagen o más tarde.',
    noImage: 'Por favor, añade al menos una imagen para reportar la incidencia.'
  },
  
  // Errores de incidencias
  incidencia: {
    notFound: 'No encontramos la incidencia que buscas.',
    alreadyReported: 'Ya has reportado esta incidencia anteriormente.',
    createFailed: 'No pudimos crear la incidencia. Por favor, inténtalo de nuevo.',
    locationRequired: 'Por favor, selecciona una ubicación para la incidencia.',
    tooManySimilar: 'Hay incidencias similares cerca. Por favor, comprueba si alguna coincide con la que quieres reportar.'
  },
  
  // Errores de geolocalización
  location: {
    denied: 'Necesitamos tu permiso para acceder a tu ubicación. Por favor, permite el acceso en tu navegador.',
    unavailable: 'No pudimos determinar tu ubicación. Por favor, selecciona manualmente la ubicación en el mapa.',
    timeout: 'La búsqueda de tu ubicación está tardando demasiado. Por favor, inténtalo de nuevo o selecciona manualmente la ubicación.',
    unsupported: 'Tu navegador no permite la geolocalización. Por favor, selecciona manualmente la ubicación en el mapa.'
  },
  
  // Errores de autenticación/permisos
  auth: {
    required: 'Necesitas iniciar sesión para realizar esta acción.',
    expired: 'Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.',
    invalid: 'Los datos de acceso no son válidos.'
  },
  
  // Errores generales
  general: {
    unknown: 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.',
    formInvalid: 'Por favor, revisa los datos del formulario e inténtalo de nuevo.',
    actionNotAllowed: 'No puedes realizar esta acción en este momento.',
    rateLimited: 'Has realizado demasiadas acciones en poco tiempo. Por favor, espera un momento antes de intentarlo de nuevo.'
  }
};

/**
 * Obtiene un mensaje de error amigable basado en el error devuelto por el servidor
 * @param {Error|Object|string} error - El error capturado
 * @returns {string} Mensaje de error amigable
 */
export function getClientErrorMessage(error) {
  if (!error) {
    return clientErrorMessages.general.unknown;
  }
  
  // Si es una cadena directa, la devolvemos (asumimos que ya es amigable)
  if (typeof error === 'string') {
    return error;
  }
  
  // Si el error es de axios
  if (error.response) {
    const { status, data } = error.response;
    
    // Si el servidor devuelve un mensaje de error amigable, lo usamos
    if (data && (data.error || data.message || data.errores)) {
      const serverMessage = data.error || data.message;
      if (typeof serverMessage === 'string') {
        return serverMessage;
      }
      
      // Si hay múltiples errores, los juntamos
      if (data.errores && Array.isArray(data.errores)) {
        return data.errores.join('. ');
      }
    }
    
    // Si no hay mensaje específico, usamos uno basado en el código HTTP
    switch (status) {
      case 400:
        return 'Los datos enviados no son válidos. Por favor, revisa la información.';
      case 401:
        return clientErrorMessages.auth.required;
      case 403:
        return 'No tienes permiso para realizar esta acción.';
      case 404:
        return 'No pudimos encontrar lo que buscas.';
      case 408:
      case 504:
        return clientErrorMessages.network.timeout;
      case 413:
        return clientErrorMessages.file.size;
      case 429:
        return clientErrorMessages.general.rateLimited;
      case 500:
      case 502:
      case 503:
        return clientErrorMessages.network.serverError;
      default:
        return clientErrorMessages.general.unknown;
    }
  }
  
  // Si es un error de red de axios
  if (error.request && !error.response) {
    if (navigator && !navigator.onLine) {
      return clientErrorMessages.network.offline;
    }
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return clientErrorMessages.network.timeout;
    }
    return clientErrorMessages.network.serverError;
  }
  
  // Si es un error de geolocalización
  if (error.code && typeof error.code === 'number') {
    switch (error.code) {
      case 1: // PERMISSION_DENIED
        return clientErrorMessages.location.denied;
      case 2: // POSITION_UNAVAILABLE
        return clientErrorMessages.location.unavailable;
      case 3: // TIMEOUT
        return clientErrorMessages.location.timeout;
    }
  }
  
  // Si es un error con mensaje directo, lo usamos
  if (error.message) {
    return error.message;
  }
  
  // Si no podemos clasificar el error, devolvemos mensaje genérico
  return clientErrorMessages.general.unknown;
}

/**
 * Analiza errores de formulario y devuelve mensajes amigables
 * @param {Object} validationErrors - Objeto con errores de validación
 * @returns {Object} Objeto con mensajes de error amigables
 */
export function getFormErrorMessages(validationErrors) {
  const errorMessages = {};
  
  for (const field in validationErrors) {
    const error = validationErrors[field];
    const errorType = typeof error === 'string' ? error : (error.type || 'unknown');
    
    switch (errorType) {
      case 'required':
        errorMessages[field] = clientErrorMessages.validation.required;
        break;
      case 'maxLength':
        errorMessages[field] = clientErrorMessages.validation.maxLength;
        break;
      case 'minLength':
        errorMessages[field] = clientErrorMessages.validation.minLength;
        break;
      case 'pattern':
      case 'format':
        errorMessages[field] = clientErrorMessages.validation.format;
        break;
      case 'location':
        errorMessages[field] = clientErrorMessages.validation.location;
        break;
      case 'name':
        errorMessages[field] = clientErrorMessages.validation.name;
        break;
      default:
        errorMessages[field] = typeof error === 'string' ? error : clientErrorMessages.validation.format;
    }
  }
  
  return errorMessages;
}

/**
 * Parsea un error de geolocalización y devuelve un mensaje amigable
 * @param {Error|Object} error - Error de geolocalización
 * @returns {string} Mensaje amigable para el usuario
 */
export function getLocationErrorMessage(error) {
  if (!error) {
    return clientErrorMessages.location.unavailable;
  }
  
  switch (error.code) {
    case 1: // PERMISSION_DENIED
      return clientErrorMessages.location.denied;
    case 2: // POSITION_UNAVAILABLE
      return clientErrorMessages.location.unavailable;
    case 3: // TIMEOUT
      return clientErrorMessages.location.timeout;
    default:
      if (!navigator.geolocation) {
        return clientErrorMessages.location.unsupported;
      }
      return clientErrorMessages.location.unavailable;
  }
}

export default {
  clientErrorMessages,
  getClientErrorMessage,
  getFormErrorMessages,
  getLocationErrorMessage
};
