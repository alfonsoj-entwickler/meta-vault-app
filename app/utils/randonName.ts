export const generateReadableFileName = (
    extension = "jpg",
    prefix = "vault",
): string => {
  const now = new Date();

  // Format: YYYY-MM-DD-HH-MM-SS
  const datePart = now.toISOString().split("T")[0]; // "2026-05-21"
  const timePart = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // "12-14-00"

  // Short random part to avoid collisions within the same second
  const randomPart = crypto.randomUUID().slice(0, 8);

  return `${prefix}-${datePart}-${timePart}-${randomPart}.${extension}`;
  // Result: "vault-2026-05-21-12-14-00-a1b2c3d4.jpg"
};
