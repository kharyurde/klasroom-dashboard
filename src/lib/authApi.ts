import { apiPost, apiPatch, apiGet, setTokens, clearTokens } from "./apiClient";

export type UserRole =
  | "platform_admin" | "school_admin" | "principal" | "vice_principal"
  | "accountant" | "teacher" | "staff" | "parent" | "student";

export type ApiAuthUser = {
  id: string;
  email: string;
  fullName: string;
  userType: UserRole;
  schoolId: string | null;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: ApiAuthUser;
  forcePasswordChange: boolean;
};

type ApiResponse<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  errors: unknown;
  timestamp: string;
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiPost<ApiResponse<LoginResponse>>(
    "/api/auth/login",
    { email, password },
    { skipAuth: true }
  );

  setTokens({
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  });

  return response.data;
}

export async function logout(): Promise<void> {
  try {
    await apiPost("/api/auth/logout", {});
  } finally {
    clearTokens();
  }
}

export function registerParent(input: {
  salutation?: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}) {
  return apiPost<ApiResponse<{
    user: {
      id: string;
      email: string;
      fullName: string;
    };
  }>>(
    "/api/auth/register-parent",
    {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      salutation: input.salutation,
      password: input.password,
      fullName: `${input.firstName} ${input.lastName}`.trim(),
      phone: input.phone || undefined,
    },
    { skipAuth: true }
  );
}

export function registerSchool(input: {
  schoolName: string; tagline?: string; address?: string; city?: string; state?: string;
  phone?: string; schoolEmail?: string; applicationFee?: number; assessmentFee?: number; acceptanceFee?: number;
  adminEmail: string; adminPassword: string; adminPhone?: string; fullName: string;
}) {
  // The form only collects one "admin name" field, but the backend expects firstName/
  // lastName separately. Split on the first space; if there's no space (single word),
  // reuse it for both so the backend's min-length checks still pass.
  const nameParts = input.fullName.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : firstName;

  const { fullName, ...rest } = input;
  return apiPost<{ success: boolean; school: unknown; admin: unknown; message: string }>(
    "/api/auth/register-school", { ...rest, firstName, lastName }, { skipAuth: true },
  );
}

export function verifyEmail(token: string) {
  return apiPost<{ message: string }>("/api/auth/verify-email", { token }, { skipAuth: true });
}

export function resendVerification(email: string) {
  return apiPost<{ message: string }>("/api/auth/resend-verification", { email }, { skipAuth: true });
}

export function forgotPassword(email: string) {
  return apiPost<{ message: string }>("/api/auth/forgot-password", { email }, { skipAuth: true });
}

export function resetPassword(accessTokenFromLink: string, newPassword: string) {
  return apiPost<{ message: string }>("/api/auth/reset-password", { accessToken: accessTokenFromLink, newPassword }, { skipAuth: true });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiPost<{ message: string }>("/api/auth/change-password", { currentPassword, newPassword });
}

export async function fetchMe() {
  const response = await apiGet<
    ApiResponse<{
      user: ApiAuthUser & {
        phone: string | null;
        status: string;
      };
    }>
  >("/api/auth/me");

  return response.data;
}
export function updateMe(input: { fullName?: string; phone?: string }) {
  return apiPatch<{ user: unknown }>("/api/auth/me", input);
}