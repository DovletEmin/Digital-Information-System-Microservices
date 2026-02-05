import api from '@/lib/api';

export interface UploadResponse {
  message: string;
  filename: string;
  original_name: string;
  size: number;
  url: string;
}

export interface FileInfo {
  name: string;
  size: number;
  last_modified: string;
  content_type: string;
  url: string;
}

export const mediaService = {
  /**
   * Загрузка одного файла
   */
  uploadFile: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post<UploadResponse>('/api/v1/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data;
  },

  /**
   * Загрузка нескольких файлов
   */
  uploadMultipleFiles: async (files: File[]): Promise<UploadResponse[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const { data } = await api.post('/api/v1/media/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data.results || [];
  },

  /**
   * Получить URL файла
   */
  getFileUrl: (filename: string): string => {
    // API Gateway проксирует запросы к media-service
    return `/api/v1/media/file/${filename}`;
  },

  /**
   * Получить URL превью изображения
   */
  getThumbnailUrl: (filename: string, width?: number, height?: number): string => {
    let url = `/api/v1/media/thumbnail/${filename}`;
    const params = new URLSearchParams();
    if (width) params.append('width', width.toString());
    if (height) params.append('height', height.toString());
    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  },

  /**
   * Удалить файл
   */
  deleteFile: async (filename: string): Promise<void> => {
    await api.delete(`/api/v1/media/file/${filename}`);
  },

  /**
   * Получить информацию о файле
   */
  getFileInfo: async (filename: string): Promise<FileInfo> => {
    const { data } = await api.get<FileInfo>(`/api/v1/media/info/${filename}`);
    return data;
  },

  /**
   * Список всех файлов
   */
  listFiles: async (): Promise<FileInfo[]> => {
    const { data } = await api.get<{ files: FileInfo[] }>('/api/v1/media/files');
    return data.files || [];
  },
};
