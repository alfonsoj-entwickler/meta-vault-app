export const decimalToDMS = (decimal: string | number) => {
    const dec = typeof decimal === 'string' ? parseFloat(decimal) : decimal;
    if (isNaN(dec)) return null;

    const abs = Math.abs(dec);
    const degrees = Math.floor(abs);
    const minutesFloat = (abs - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const secondsFloat = (minutesFloat - minutes) * 60;

    // Retornamos el array de arrays [numerador, denominador]
    return [
      [degrees, 1],
      [minutes, 1],
      [Math.round(secondsFloat * 1000000), 1000000] // Multiplicamos alto para no perder precisión en los segundos
    ];
  };