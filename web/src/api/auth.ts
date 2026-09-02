import client from "./client";
import type {
  LoginReq,
  LoginResp,
  ChangePasswordReq,
  UpdateProfileReq,
  ProfileResp,
  VerifyPasswordReq,
} from "./types";
import { encryptPassword } from "@/utils/encrypt";

export const authApi = {
  loginUser: async (data: LoginReq) =>
    client.post<never, LoginResp>(
      "/api/v1/auth/login",
      {
        username: data.username,
        ...(data.tenant_code?.trim()
          ? { tenant_code: data.tenant_code.trim() }
          : {}),
        password: await encryptPassword(data.password),
      },
      { silentBizError: true },
    ),

  getProfile: () => client.get<never, ProfileResp>("/api/v1/me/profile"),

  updateProfile: (data: UpdateProfileReq) => client.put<never, void>("/api/v1/me/profile", data),

  uploadMySignature: (file: File, updatedAt: string, expectedSignatureFileId?: number | null) => {
    const body = new FormData()
    body.append('file', file)
    body.append('updated_at', updatedAt)
    if (expectedSignatureFileId) {
      body.append('expected_signature_file_id', String(expectedSignatureFileId))
    }
    return client.put<never, ProfileResp>('/api/v1/me/signature', body)
  },

  verifyPassword: async (data: VerifyPasswordReq) =>
    client.post<never, void>(
      "/api/v1/me/verify-password",
      {
        password: await encryptPassword(data.password),
      },
      { silentBizError: true },
    ),

  changePassword: async (data: ChangePasswordReq) =>
    client.put<never, void>("/api/v1/me/password", {
      old_password: await encryptPassword(data.old_password),
      new_password: await encryptPassword(data.new_password),
    }),

  getPermissions: () => client.get<never, string[]>("/api/v1/me/permissions"),

  logout: () => client.post<never, void>("/api/v1/auth/logout"),
};
