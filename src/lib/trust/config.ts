import { CredentialType } from './types';

export const CREDENTIAL_TYPE_OPTIONS: Array<{ value: CredentialType; label: string; bucket: 'chef-certificates' | 'chef-licenses' | 'chef-insurance' }> = [
  { value: 'food_safety_certificate', label: 'Food Safety Certificate', bucket: 'chef-certificates' },
  { value: 'servsafe', label: 'ServSafe', bucket: 'chef-certificates' },
  { value: 'culinary_certification', label: 'Culinary Certification', bucket: 'chef-certificates' },
  { value: 'business_license', label: 'Business License', bucket: 'chef-licenses' },
  { value: 'permit', label: 'Permit', bucket: 'chef-licenses' },
  { value: 'insurance', label: 'Insurance Proof', bucket: 'chef-insurance' },
  { value: 'other_certificate', label: 'Other Credential', bucket: 'chef-certificates' },
];

export const ALLOWED_CREDENTIAL_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const MAX_CREDENTIAL_FILE_SIZE_BYTES = 10 * 1024 * 1024;
