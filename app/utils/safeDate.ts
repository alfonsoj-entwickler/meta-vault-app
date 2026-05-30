// Helper function to format dates to HTML5 standard (datetime-local)
  export const safeDate = (val: string | number | Date | null | undefined): string => {
    if (!val) return "";
    try {
      // If it is an EXIF string (e.g. 2026:05:15 10:30:00), we replace the first ':' with '-'
      let cleanVal: string | number | Date = val;
      if (typeof val === 'string') {
        cleanVal = val.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
      }

      const dateObj = cleanVal instanceof Date ? cleanVal : new Date(cleanVal);
      if (isNaN(dateObj.getTime())) return "";
      
      // Extract parts manually to prevent .toISOString() from shifting the timezone/hour
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