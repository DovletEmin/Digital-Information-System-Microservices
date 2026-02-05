'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { mediaService } from '@/services/mediaService';

interface ImageUploadProps {
  value?: string; // Текущий URL изображения
  onChange: (url: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function ImageUpload({ value, onChange, onError, className = '' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      onError?.('Please select an image file');
      return;
    }

    // Проверка размера (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      onError?.('File size should not exceed 5MB');
      return;
    }

    try {
      setUploading(true);

      // Загружаем файл
      const result = await mediaService.uploadFile(file);

      // Сохраняем URL
      onChange(result.url);
      setPreview(result.url);
    } catch (error) {
      console.error('Upload failed:', error);
      onError?.('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(undefined);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative w-full">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border-2 border-gray-300 bg-gray-50">
            <img
              src={preview}
              alt="Preview"
              className="h-full w-full object-contain"
            />
          </div>
          
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleClick}
              disabled={uploading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Change Image
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          ) : (
            <ImageIcon className="h-12 w-12 text-gray-400" />
          )}
          
          <p className="mt-4 text-sm font-medium text-gray-700">
            {uploading ? 'Uploading...' : 'Click to upload image'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            PNG, JPG, GIF up to 5MB
          </p>
        </button>
      )}
    </div>
  );
}
