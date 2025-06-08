/**
 * Validates if a string is a valid UUID
 * @param id The string to validate
 * @returns True if the string is a valid UUID, false otherwise
 */
export function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validates if a string is a valid email address
 * @param email The string to validate
 * @returns True if the string is a valid email, false otherwise
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates if a string is a valid Chinese phone number
 * @param phone The string to validate
 * @returns True if the string is a valid phone number, false otherwise
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

export default {
  isValidUUID,
  isValidEmail,
  isValidPhone
};