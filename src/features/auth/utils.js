// Validation helpers that mirror the API contract (sections 0.12 and 1.1). The server is the authority.

// Egyptian mobile: 01012345678, +201012345678 or 201012345678
export const phoneRegex = /^(?:\+20|20|0)1[0125][0-9]{8}$/;

// returns the phone as 01XXXXXXXXX
export function normalizePhone(phone) {
  return phone.trim().replace(/^\+?20/, "0");
}

// 3 to 100 characters, at least 2 words, letters / spaces / ' - . only
export function isValidFullName(fullName) {
  const name = fullName.trim();
  if (name.length < 3 || name.length > 100) return false;
  if (name.split(/\s+/).length < 2) return false;
  return /^[\p{L}\s'.-]+$/u.test(name);
}

// 8 to 128 characters, a letter and a digit, not containing the email's part before @ or the national ID
// returns an error key (under "validation." in the locale file) or null
export function checkPassword(password, email = "", nationalId = "") {
  if (password.length < 8 || password.length > 128) return "passwordLength";
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return "passwordLetterDigit";
  const localPart = email.split("@")[0].toLowerCase();
  if (localPart.length >= 3 && password.toLowerCase().includes(localPart)) return "passwordHasEmail";
  if (nationalId && password.includes(nationalId)) return "passwordHasNationalId";
  return null;
}

// Structure rules of the national ID (contract 1.1). Returns { valid, birthDate, gender }.
export function validateNationalId(nationalId) {
  const none = { valid: false, birthDate: null, gender: null };
  if (!/^\d{14}$/.test(nationalId)) return none;

  const century = nationalId[0];
  if (century !== "2" && century !== "3") return none;
  const year = (century === "2" ? 1900 : 2000) + Number(nationalId.slice(1, 3));
  const month = Number(nationalId.slice(3, 5));
  const day = Number(nationalId.slice(5, 7));

  // a real calendar date that is not in the future
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isRealDate || date.getTime() > Date.now()) return none;

  // birth governorate code
  const code = Number(nationalId.slice(7, 9));
  const validCode = (code >= 1 && code <= 4) || (code >= 11 && code <= 19) || (code >= 21 && code <= 29) || (code >= 31 && code <= 35) || code === 88;
  if (!validCode) return none;

  const birthDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const gender = Number(nationalId[12]) % 2 === 1 ? "MALE" : "FEMALE";
  return { valid: true, birthDate, gender };
}
