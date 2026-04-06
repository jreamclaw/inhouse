export type TrustLabel = 'Low trust' | 'Building trust' | 'Trusted chef' | 'Highly trusted';

export type ChefBadgeType =
  | 'verified_identity'
  | 'certified'
  | 'licensed_business'
  | 'top_rated'
  | 'pro_chef'
  | 'new_chef';

export type CredentialStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type CredentialType =
  | 'food_safety_certificate'
  | 'servsafe'
  | 'culinary_certification'
  | 'business_license'
  | 'permit'
  | 'insurance'
  | 'other_certificate';

export interface TrustProfileShape {
  avatar_url?: string | null;
  bio?: string | null;
  email_verified?: boolean | null;
  phone_verified?: boolean | null;
  identity_verified?: boolean | null;
  completed_orders?: number | null;
  complaints_count?: number | null;
  rating_avg?: number | null;
  rating_count?: number | null;
}

export interface TrustCredentialShape {
  credential_type: CredentialType | string;
  status: CredentialStatus | string;
  expiration_date?: string | null;
}

export interface TrustScoreBreakdownItem {
  key: string;
  label: string;
  points: number;
  earned: boolean;
  description?: string;
}

export interface TrustScoreResult {
  score: number;
  label: TrustLabel;
  checklist: TrustScoreBreakdownItem[];
  approvedCertificates: number;
  approvedLicenses: number;
  approvedCredentials: number;
  badges: ChefBadgeType[];
}
