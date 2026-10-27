/** Server-only encrypted student persistence; no plaintext PII outside the encrypted envelope. */
import { createHmac } from 'node:crypto';
import { encryptJson, decryptJson, EncryptedDataError } from './field-encryption.mjs';
import { studentPrivateFields, projectStudentPublicFields } from './student-registry.mjs';
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
function indexKey() {
  const value = process.env.FTB_STUDENT_INDEX_KEY_B64;
  if (typeof value !== 'string' || !BASE64.test(value)) throw new Error('Student index secret unavailable.');
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32 || key.toString('base64') !== value) throw new Error('Student index secret unavailable.');
  return key;
}
export function isStudentIndexConfigured() { try { indexKey(); return true; } catch { return false; } }
export function studentDocumentId(escolaCodigo, codigoInterno) {
  if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(escolaCodigo) || !/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(codigoInterno)) throw new Error('Invalid identifier.');
  return createHmac('sha256', indexKey()).update(`student:v1:${escolaCodigo}:${codigoInterno}`).digest('hex');
}
export function sealStudent(input, path) {
  const privateData = {};
  for (const field of studentPrivateFields) if (Object.hasOwn(input, field)) privateData[field] = input[field];
  return { ...projectStudentPublicFields(input), dadosPrivados: encryptJson(privateData, path + '#student-v1') };
}
export function openStudent(value, path) {
  if (!value?.dadosPrivados || typeof value?.escolaCodigo !== 'string') throw new EncryptedDataError();
  const privateData = decryptJson(value.dadosPrivados, path + '#student-v1');
  if (!privateData || typeof privateData !== 'object' || Array.isArray(privateData)) throw new EncryptedDataError();
  // Return only expected fields, never arbitrary persisted data.
  const output = { escolaCodigo: value.escolaCodigo, estado: value.estado };
  for (const field of studentPrivateFields) if (Object.hasOwn(privateData, field)) output[field] = privateData[field];
  return output;
}
