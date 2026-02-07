'use client';

import { useState, useCallback } from 'react';
import { Upload, File, X, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onError: (error: string) => void;
  acceptedTypes?: string[];
  label?: string;
  maxSizeMB?: number;
}

export default function FileUpload({
  value,
  onChange,
  onError,
  acceptedTypes = ['.pdf', '.epub'],
  label = 'Upload File',
  maxSizeMB = 50
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      
      // Проверка размера файла
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        throw new Error(`File size must be less than ${maxSizeMB}MB`);
      }

      // Проверка типа файла
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedTypes.includes(fileExtension)) {
        throw new Error(`Only ${acceptedTypes.join(', ')} files are allowed`);
      }

      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();
      onChange(data.url);
    } catch (error) {
      console.error('Upload error:', error);
      onError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    onChange('');
  };

  const getFileName = (url: string) => {
    try {
      return url.split('/').pop() || url;
    } catch {
      return url;
    }
  };

  return (
    <div className="w-full">
      {!value ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <input
            type="file"
            onChange={handleChange}
            accept={acceptedTypes.join(',')}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          
          <div className="flex flex-col items-center justify-center space-y-3">
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-500" />
                <p className="text-sm text-gray-600">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Drag and drop or click to browse
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Supported: {acceptedTypes.join(', ')} (max {maxSizeMB}MB)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <File className="w-8 h-8 text-blue-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {getFileName(value)}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {value}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="ml-4 p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
