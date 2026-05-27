export const generateReadableFileName = (
    extension = "jpg",
    prefix = "vault",
): string => {
  const now = new Date();

  // Formato: YYYY-MM-DD-HH-MM-SS
  const datePart = now.toISOString().split("T")[0]; // "2026-05-21"
  const timePart = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // "12-14-00"

  // Parte aleatoria corta para evitar colisiones en el mismo segundo
  const randomPart = crypto.randomUUID().slice(0, 8);

  return `${prefix}-${datePart}-${timePart}-${randomPart}.${extension}`;
  // Resultado: "vault-2026-05-21-12-14-00-a1b2c3d4.jpg"
};
