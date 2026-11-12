/**
 * Generate alphanumeric crate codes in format: [0-9][A-Z]
 * Examples: 0A, 1B, 5Z, 9Z, 0Y
 * Total possible codes: 260 (10 digits × 26 letters)
 */

/**
 * Generate a random alphanumeric code in 0A-9Z format
 */
export function generateCrateCode(): string {
  const digit = Math.floor(Math.random() * 10); // 0-9
  const letterCode = Math.floor(Math.random() * 26); // 0-25
  const letter = String.fromCharCode(65 + letterCode); // A-Z
  return `${digit}${letter}`;
}

/**
 * Validate if a string is a valid crate code (0A-9Z format)
 */
export function isValidCrateCode(code: string): boolean {
  return /^[0-9][A-Z]$/.test(code);
}
