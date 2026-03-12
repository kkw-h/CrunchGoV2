import { api } from "./api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface UploadResponse {
  url: string;
  key: string;
  filename: string;
}

export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/upload/image`, {
    method: "POST",
    body: formData,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "上传失败");
  }

  return response.json();
}
