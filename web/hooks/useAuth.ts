"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface User {
  id: string;
  username: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查本地存储的 token
    const token = localStorage.getItem("token");
    if (token) {
      // 获取用户信息
      api
        .get<User>("/api/v1/auth/me")
        .then(({ data, error }) => {
          if (data) {
            setUser(data);
          } else {
            localStorage.removeItem("token");
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "登录失败");
    }

    const data = await response.json();
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);

    // 获取用户信息
    const { data: userData } = await api.get<User>("/api/v1/auth/me");
    if (userData) {
      setUser(userData);
    }

    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    window.location.href = "/login";
  }, []);

  return { user, loading, login, logout, isAuthenticated: !!user };
}
