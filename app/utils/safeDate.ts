// Función para formatear fechas al estándar HTML5 (datetime-local)
  export const safeDate = (val: any) => {
    if (!val) return "";
    try {
      // Si es un string de EXIF (ej: 2026:05:15 10:30:00), cambiamos los primeros ':' por '-'
      let cleanVal = val;
      if (typeof val === 'string') {
        cleanVal = val.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
      }
      
      const dateObj = cleanVal instanceof Date ? cleanVal : new Date(cleanVal);
      if (isNaN(dateObj.getTime())) return "";
      
      // Extraemos las partes manualmente para evitar que .toISOString() desplace la hora
      const yyyy = dateObj.getFullYear();
      const MM = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const mm = String(dateObj.getMinutes()).padStart(2, '0');
      
      return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
    } catch (e) {
        console.error('Error Date: ', e);
      return "";
    }
  };