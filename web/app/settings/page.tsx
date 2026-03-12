"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  fetchMerchantProfile,
  updateMerchantProfile,
  fetchMerchantSettings,
  updateMerchantSettings,
  fetchWechatConfig,
  updateWechatConfig,
} from "@/lib/merchant";
import { MerchantProfile, MerchantProfileUpdate, MerchantSettings, WechatConfig } from "@/types";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "settings" | "wechat">("profile");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 获取商家资料
  const { data: profile, mutate: mutateProfile } = useSWR(
    "merchant/profile",
    fetchMerchantProfile,
    { revalidateOnFocus: false }
  );

  // 获取商家设置
  const { data: settings, mutate: mutateSettings } = useSWR(
    "merchant/settings",
    fetchMerchantSettings,
    { revalidateOnFocus: false }
  );

  // 获取小程序配置
  const { data: wechatConfig, mutate: mutateWechat } = useSWR(
    "merchant/wechat",
    fetchWechatConfig,
    { revalidateOnFocus: false }
  );

  const handleSaveProfile = async (data: MerchantProfileUpdate) => {
    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await updateMerchantProfile(data);
      mutateProfile();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveSettings = async (data: Partial<MerchantSettings>) => {
    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await updateMerchantSettings(data);
      mutateSettings();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveWechat = async (data: { app_id?: string; app_secret?: string }) => {
    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await updateWechatConfig(data);
      mutateWechat();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 mr-4">
                ← 返回
              </Link>
              <h1 className="text-xl font-bold text-gray-900">店铺设置</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 标签页 */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("profile")}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === "profile"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                店铺资料
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === "settings"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                营业设置
              </button>
              <button
                onClick={() => setActiveTab("wechat")}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === "wechat"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                小程序配置
              </button>
            </nav>
          </div>

          {/* 提示消息 */}
          {(saveError || saveSuccess) && (
            <div className="p-4">
              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
                  保存成功
                </div>
              )}
            </div>
          )}

          {/* 店铺资料 */}
          {activeTab === "profile" && profile && (
            <ProfileForm
              profile={profile}
              onSave={handleSaveProfile}
              loading={saveLoading}
            />
          )}

          {/* 营业设置 */}
          {activeTab === "settings" && settings && (
            <SettingsForm
              settings={settings}
              onSave={handleSaveSettings}
              loading={saveLoading}
            />
          )}

          {/* 小程序配置 */}
          {activeTab === "wechat" && wechatConfig && (
            <WechatForm
              config={wechatConfig}
              onSave={handleSaveWechat}
              loading={saveLoading}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// 店铺资料表单
interface ProfileFormProps {
  profile: MerchantProfile;
  onSave: (data: Partial<MerchantProfile>) => void;
  loading: boolean;
}

function ProfileForm({ profile, onSave, loading }: ProfileFormProps) {
  const [formData, setFormData] = useState({
    name: profile.name,
    address: profile.address || "",
    phone: profile.phone || "",
    openTime: profile.business_hours.open,
    closeTime: profile.business_hours.close,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: formData.name,
      address: formData.address || null,
      phone: formData.phone || null,
      business_hours: {
        open: formData.openTime,
        close: formData.closeTime,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          店铺名称 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          placeholder="请输入店铺名称"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          店铺地址
        </label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          placeholder="请输入店铺地址"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          联系电话
        </label>
        <input
          type="text"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          placeholder="请输入联系电话"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            营业开始时间
          </label>
          <input
            type="time"
            value={formData.openTime}
            onChange={(e) => setFormData({ ...formData, openTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            营业结束时间
          </label>
          <input
            type="time"
            value={formData.closeTime}
            onChange={(e) => setFormData({ ...formData, closeTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "保存中..." : "保存"}
        </button>
      </div>
    </form>
  );
}

// 营业设置表单
interface SettingsFormProps {
  settings: MerchantSettings;
  onSave: (data: Partial<MerchantSettings>) => void;
  loading: boolean;
}

function SettingsForm({ settings, onSave, loading }: SettingsFormProps) {
  const [formData, setFormData] = useState({
    prefix: settings.pickup_code.prefix,
    dailyReset: settings.pickup_code.daily_reset,
    autoPrint: settings.auto_print_order,
    quickRemarks: settings.quick_remarks || [],
  });
  const [newRemark, setNewRemark] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      pickup_code: {
        prefix: formData.prefix,
        daily_reset: formData.dailyReset,
      },
      auto_print_order: formData.autoPrint,
      quick_remarks: formData.quickRemarks,
    });
  };

  const addRemark = () => {
    if (newRemark.trim() && formData.quickRemarks.length < 10) {
      setFormData({
        ...formData,
        quickRemarks: [...formData.quickRemarks, newRemark.trim()],
      });
      setNewRemark("");
    }
  };

  const removeRemark = (index: number) => {
    setFormData({
      ...formData,
      quickRemarks: formData.quickRemarks.filter((_, i) => i !== index),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="border-b pb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">取餐码设置</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              取餐码前缀
            </label>
            <input
              type="text"
              maxLength={5}
              value={formData.prefix}
              onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="如：A"
            />
            <p className="mt-1 text-sm text-gray-500">
              设置后取餐码格式为：前缀+数字，如 A001、B002。留空表示纯数字。
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="dailyReset"
              checked={formData.dailyReset}
              onChange={(e) => setFormData({ ...formData, dailyReset: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="dailyReset" className="ml-2 text-sm text-gray-700">
              每天自动重置取餐码计数器
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">打印设置</h3>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoPrint"
            checked={formData.autoPrint}
            onChange={(e) => setFormData({ ...formData, autoPrint: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="autoPrint" className="ml-2 text-sm text-gray-700">
            新订单自动打印小票
          </label>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          开启后，新订单会自动发送到打印机（需配合打印设备使用）
        </p>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">常用备注设置</h3>
        <p className="text-sm text-gray-500 mb-4">
          设置常用备注后，顾客在下单时可以快速选择这些备注（最多10条）
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newRemark}
            onChange={(e) => setNewRemark(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRemark())}
            maxLength={20}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="输入常用备注，如：少盐、不要辣"
          />
          <button
            type="button"
            onClick={addRemark}
            disabled={formData.quickRemarks.length >= 10 || !newRemark.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            添加
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {formData.quickRemarks.map((remark, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm border border-orange-200"
            >
              {remark}
              <button
                type="button"
                onClick={() => removeRemark(index)}
                className="ml-2 text-orange-400 hover:text-orange-600"
              >
                ×
              </button>
            </span>
          ))}
          {formData.quickRemarks.length === 0 && (
            <span className="text-gray-400 text-sm">暂无常用备注</span>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "保存中..." : "保存"}
        </button>
      </div>
    </form>
  );
}

// 小程序配置表单
interface WechatFormProps {
  config: WechatConfig;
  onSave: (data: { app_id?: string; app_secret?: string }) => void;
  loading: boolean;
}

function WechatForm({ config, onSave, loading }: WechatFormProps) {
  const [formData, setFormData] = useState({
    appId: config.app_id || "",
    appSecret: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      app_id: formData.appId,
      app_secret: formData.appSecret || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
        <h4 className="text-sm font-medium text-blue-900 mb-2">配置说明</h4>
        <p className="text-sm text-blue-700">
          此处配置用于对接微信小程序。配置后顾客可以通过小程序下单、查看排队进度。
          请前往
          <a href="https://mp.weixin.qq.com" target="_blank" rel="noopener noreferrer" className="underline mx-1">
            微信公众平台
          </a>
          获取 AppID 和 AppSecret。
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          小程序 AppID
        </label>
        <input
          type="text"
          value={formData.appId}
          onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          placeholder="wx1234567890abcdef"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          小程序 AppSecret
        </label>
        <input
          type="password"
          value={formData.appSecret}
          onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          placeholder="仅更新时填写，不显示原有值"
        />
        <p className="mt-1 text-sm text-gray-500">
          AppSecret 仅用于小程序服务端接口调用，请妥善保管
        </p>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "保存中..." : "保存"}
        </button>
      </div>
    </form>
  );
}
