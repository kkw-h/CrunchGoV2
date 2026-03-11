import { api } from "./api";
import {
  MerchantProfile,
  MerchantProfileUpdate,
  MerchantSettings,
  MerchantSettingsUpdate,
  WechatConfig,
  WechatConfigUpdate,
} from "@/types";

// ============ 商家资料 API ============

export async function fetchMerchantProfile(): Promise<MerchantProfile> {
  const response = await api.get<MerchantProfile>("/api/v1/merchant/profile");
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function updateMerchantProfile(
  data: MerchantProfileUpdate
): Promise<MerchantProfile> {
  const response = await api.put<MerchantProfile>("/api/v1/merchant/profile", data);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

// ============ 商家设置 API ============

export async function fetchMerchantSettings(): Promise<MerchantSettings> {
  const response = await api.get<MerchantSettings>("/api/v1/merchant/settings");
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function updateMerchantSettings(
  data: MerchantSettingsUpdate
): Promise<MerchantSettings> {
  const response = await api.put<MerchantSettings>("/api/v1/merchant/settings", data);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

// ============ 微信小程序配置 API ============

export async function fetchWechatConfig(): Promise<WechatConfig> {
  const response = await api.get<WechatConfig>("/api/v1/merchant/wechat");
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}

export async function updateWechatConfig(
  data: WechatConfigUpdate
): Promise<WechatConfig> {
  const response = await api.put<WechatConfig>("/api/v1/merchant/wechat", data);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data!;
}
