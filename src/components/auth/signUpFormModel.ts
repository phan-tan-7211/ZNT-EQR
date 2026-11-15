import { PRIVACY_VERSION_HASH, TERMS_VERSION_HASH } from '@/lib/legalPolicyVersions';
import type { PasswordComplexityResult } from '@/lib/passwordPolicy';

export const SIGNUP_EMAIL_REGEX = /[^\s@]+@[^\s@]+\.[^\s@]+/;

type TranslationParams = Record<string, string | number>;
export type SignupTranslator = (key: string, params?: TranslationParams) => string;

const translate = (
  t: SignupTranslator | undefined,
  key: string,
  fallback: string,
  params?: TranslationParams,
): string => (t ? t(key, params) : fallback);

export type SignUpFormFields = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  organizationName: string;
};

export type SignUpValidationContext = {
  formData: SignUpFormFields;
  touched: Record<string, boolean>;
  emailError: string | null;
  orgNameError: string | null;
  passwordMatch: boolean | null;
  complexity: PasswordComplexityResult;
  termsAccepted: boolean;
  acceptanceTouched: boolean;
  submitAttempted: boolean;
  hcaptchaEnabled: boolean;
  hcaptchaToken: string | null;
  isInvitationSignup?: boolean;
};

export function isSignupEmailValid(email: string): boolean {
  return SIGNUP_EMAIL_REGEX.test(email);
}

export function getEmailErrorForValue(value: string, t?: SignupTranslator): string | null {
  return isSignupEmailValid(value) || value.length === 0
    ? null
    : translate(t, 'auth.validEmail', 'Enter a valid email address');
}

export function canStartGoogleSignup(
  organizationName: string,
  orgNameError: string | null,
): boolean {
  return Boolean(organizationName.trim()) && !orgNameError;
}

export function getInvitedOrgNameConflict(
  orgName: string,
  invitedOrgName: string | undefined,
  t?: SignupTranslator,
): string | null {
  if (!invitedOrgName) return null;
  if (orgName.trim().toLowerCase() === invitedOrgName.trim().toLowerCase()) {
    return translate(
      t,
      'auth.organizationNameConflict',
      `Please choose a different name than "${invitedOrgName}"`,
      { name: invitedOrgName },
    );
  }
  return null;
}

export function computePasswordMatch(
  password: string,
  confirmPassword: string,
  changedField: string,
  prevPassword: string,
  prevConfirmPassword: string,
): boolean | null {
  const newPassword = changedField === 'password' ? password : prevPassword;
  const newConfirmPassword = changedField === 'confirmPassword' ? confirmPassword : prevConfirmPassword;

  if (newConfirmPassword) {
    return newPassword === newConfirmPassword;
  }
  return null;
}

export function getSignupFieldError(
  field: string,
  ctx: SignUpValidationContext,
  t?: SignupTranslator,
): string | null {
  if (!ctx.touched[field]) return null;
  switch (field) {
    case 'name':
      return !ctx.formData.name.trim()
        ? translate(t, 'auth.fullNameRequired', 'Full name is required')
        : null;
    case 'email':
      if (!ctx.formData.email.trim()) {
        return translate(t, 'auth.emailRequired', 'Email is required');
      }
      return ctx.emailError;
    case 'organizationName':
      if (ctx.orgNameError) return ctx.orgNameError;
      return !ctx.formData.organizationName.trim()
        ? translate(t, 'auth.organizationNameRequired', 'Organization name is required')
        : null;
    case 'password':
      if (!ctx.formData.password) {
        return translate(t, 'auth.passwordRequired', 'Password is required');
      }
      return ctx.complexity.valid
        ? null
        : translate(t, 'auth.passwordRequirementsNotMet', 'Password does not meet requirements');
    case 'confirmPassword':
      if (!ctx.formData.confirmPassword) {
        return translate(t, 'auth.confirmPasswordRequired', 'Please confirm your password');
      }
      return ctx.passwordMatch === false
        ? translate(t, 'auth.passwordsDoNotMatch', 'Passwords do not match')
        : null;
    default:
      return null;
  }
}

export function getSignupAcceptanceError(
  termsAccepted: boolean,
  acceptanceTouched: boolean,
  submitAttempted: boolean,
  t?: SignupTranslator,
): string | null {
  if (!acceptanceTouched && !submitAttempted) return null;
  return termsAccepted
    ? null
    : translate(
        t,
        'auth.acceptTermsValidation',
        'You must accept the Terms of Service and Privacy Policy',
      );
}

export function isSignupFormValid(
  ctx: SignUpValidationContext,
  options: { isInvitationSignup?: boolean } = {},
): boolean {
  const isInvitationSignup = options.isInvitationSignup ?? ctx.isInvitationSignup;
  const baseValid =
    ctx.formData.name.trim() &&
    ctx.formData.email.trim() &&
    ctx.complexity.valid &&
    ctx.formData.confirmPassword &&
    (isInvitationSignup || ctx.formData.organizationName.trim()) &&
    ctx.passwordMatch === true &&
    (isInvitationSignup || !ctx.orgNameError) &&
    ctx.termsAccepted;

  return ctx.hcaptchaEnabled ? Boolean(baseValid && ctx.hcaptchaToken) : Boolean(baseValid);
}

export function buildSignupUserMetadata(
  formData: SignUpFormFields,
  options: { invitedOrgId?: string; invitedOrgName?: string; isInvitationSignup?: boolean },
): Record<string, string> {
  const signUpData: Record<string, string> = {
    name: formData.name.trim(),
  };

  if (!options.isInvitationSignup) {
    signUpData.organization_name = formData.organizationName.trim();
  }

  if (options.invitedOrgId) {
    signUpData.invited_organization_id = options.invitedOrgId;
  }
  if (options.invitedOrgName) {
    signUpData.invited_organization_name = options.invitedOrgName;
  }
  if (options.invitedOrgId || options.invitedOrgName) {
    signUpData.signup_source = 'invite';
  }

  signUpData.terms_accepted = 'true';
  signUpData.terms_version_hash = TERMS_VERSION_HASH;
  signUpData.privacy_version_hash = PRIVACY_VERSION_HASH;
  signUpData.terms_accepted_at = new Date().toISOString();

  return signUpData;
}

export const ALL_SIGNUP_FIELDS_TOUCHED: Record<string, boolean> = {
  name: true,
  email: true,
  organizationName: true,
  password: true,
  confirmPassword: true,
};
