'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  formatBytes,
  useFileUpload,
  type FileWithPreview,
} from '@/hooks/use-file-upload';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CloudUpload,
  Download,
  FileArchiveIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  HeadphonesIcon,
  ImageIcon,
  RefreshCwIcon,
  Trash2,
  TriangleAlert,
  Upload,
  VideoIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadItem extends FileWithPreview {
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface FileUploadProps {
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  multiple?: boolean;
  className?: string;
  onFilesChange?: (files: FileWithPreview[]) => void;
  onUpload?: (files: File[]) => Promise<void>;
  initialFiles?: FileUploadItem[];
}

export function FileUpload({
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = '*',
  multiple = true,
  className,
  onFilesChange,
  onUpload,
  initialFiles = [],
}: FileUploadProps) {
  const t = useTranslations('Common');
  const tDocs = useTranslations('Documents');

  const [uploadFiles, setUploadFiles] = useState<FileUploadItem[]>(initialFiles);

  const [
    { isDragging, errors },
    {
      removeFile,
      clearFiles,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    maxFiles,
    maxSize,
    accept,
    multiple,
    onFilesChange: (newFiles) => {
      // Convert to upload items when files change
      const newUploadFiles = newFiles.map((file) => {
        const existingFile = uploadFiles.find((existing) => existing.id === file.id);

        if (existingFile) {
          return existingFile;
        } else {
          return {
            ...file,
            progress: 0,
            status: 'uploading' as const,
          };
        }
      });
      setUploadFiles(newUploadFiles);
      onFilesChange?.(newFiles);
    },
    onFilesAdded: async (addedFiles) => {
      // Trigger upload for new files
      if (onUpload) {
        const filesToUpload = addedFiles
          .map((f) => f.file)
          .filter((f) => f instanceof File) as File[];

        if (filesToUpload.length > 0) {
          try {
            await onUpload(filesToUpload);
            // Mark files as completed after successful upload
            setUploadFiles((prev) =>
              prev.map((file) => {
                const wasUploaded = addedFiles.some((added) => added.id === file.id);
                if (wasUploaded && file.status === 'uploading') {
                  return { ...file, progress: 100, status: 'completed' as const };
                }
                return file;
              })
            );
          } catch (error) {
            // Mark files as error if upload failed
            setUploadFiles((prev) =>
              prev.map((file) => {
                const wasUploaded = addedFiles.some((added) => added.id === file.id);
                if (wasUploaded && file.status === 'uploading') {
                  return {
                    ...file,
                    progress: 0,
                    status: 'error' as const,
                    error: 'Upload failed. Please try again.',
                  };
                }
                return file;
              })
            );
          }
        }
      }
    },
  });

  // Simulate upload progress for files without onUpload handler
  useEffect(() => {
    if (onUpload) return; // Skip simulation if we have a real upload handler

    const interval = setInterval(() => {
      setUploadFiles((prev) =>
        prev.map((file) => {
          if (file.status !== 'uploading') return file;

          const increment = Math.random() * 15 + 5;
          const newProgress = Math.min(file.progress + increment, 100);

          if (newProgress >= 100) {
            return {
              ...file,
              progress: 100,
              status: 'completed' as const,
            };
          }

          return { ...file, progress: newProgress };
        }),
      );
    }, 500);

    return () => clearInterval(interval);
  }, [onUpload]);

  const removeUploadFile = (fileId: string) => {
    setUploadFiles((prev) => prev.filter((file) => file.id !== fileId));
    removeFile(fileId);
  };

  const retryUpload = async (fileId: string) => {
    const file = uploadFiles.find((f) => f.id === fileId);
    if (!file || !(file.file instanceof File)) return;

    setUploadFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, progress: 0, status: 'uploading' as const, error: undefined } : f,
      ),
    );

    if (onUpload) {
      try {
        await onUpload([file.file]);
        setUploadFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress: 100, status: 'completed' as const } : f))
        );
      } catch (error) {
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, progress: 0, status: 'error' as const, error: 'Upload failed. Please try again.' }
              : f
          )
        );
      }
    }
  };

  const getFileIcon = (file: File | { type: string }) => {
    const type = file.type;
    if (type.startsWith('image/')) return <ImageIcon className="size-4" />;
    if (type.startsWith('video/')) return <VideoIcon className="size-4" />;
    if (type.startsWith('audio/')) return <HeadphonesIcon className="size-4" />;
    if (type.includes('pdf')) return <FileTextIcon className="size-4" />;
    if (type.includes('word') || type.includes('doc')) return <FileTextIcon className="size-4" />;
    if (type.includes('excel') || type.includes('sheet')) return <FileSpreadsheetIcon className="size-4" />;
    if (type.includes('zip') || type.includes('rar')) return <FileArchiveIcon className="size-4" />;
    return <FileTextIcon className="size-4" />;
  };

  const getFileTypeLabel = (file: File | { type: string }) => {
    const type = file.type;
    if (type.startsWith('image/')) return 'Image';
    if (type.startsWith('video/')) return 'Video';
    if (type.startsWith('audio/')) return 'Audio';
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || type.includes('doc')) return 'Word';
    if (type.includes('excel') || type.includes('sheet')) return 'Excel';
    if (type.includes('zip') || type.includes('rar')) return 'Archive';
    if (type.includes('json')) return 'JSON';
    if (type.includes('text')) return 'Text';
    return 'File';
  };

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'relative rounded-lg border border-dashed p-6 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input {...getInputProps()} className="sr-only" />

        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full bg-muted transition-colors',
              isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25',
            )}
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              {tDocs('dropFiles') || 'Drop files here or'}{' '}
              <button
                type="button"
                onClick={openFileDialog}
                className="cursor-pointer text-primary underline-offset-4 hover:underline"
              >
                {tDocs('browseFiles') || 'browse files'}
              </button>
            </p>
            <p className="text-xs text-muted-foreground">
              {tDocs('maxFileSize') || 'Maximum file size'}: {formatBytes(maxSize)} • {tDocs('maxFiles') || 'Maximum files'}: {maxFiles}
            </p>
          </div>
        </div>
      </div>

      {/* Files Table */}
      {uploadFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              {tDocs('files') || 'Files'} ({uploadFiles.length})
            </h3>
            <div className="flex gap-2">
              <Button onClick={openFileDialog} variant="outline" size="sm">
                <CloudUpload />
                {tDocs('addFiles') || 'Add files'}
              </Button>
              <Button onClick={clearFiles} variant="outline" size="sm">
                <Trash2 />
                {tDocs('removeAll') || 'Remove all'}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="h-9">{tDocs('name') || 'Name'}</TableHead>
                  <TableHead className="h-9">{tDocs('type') || 'Type'}</TableHead>
                  <TableHead className="h-9">{tDocs('size') || 'Size'}</TableHead>
                  <TableHead className="h-9 w-[100px] text-end">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadFiles.map((fileItem) => (
                  <TableRow key={fileItem.id}>
                    <TableCell className="py-2 ps-1.5">
                      <div className="flex items-center gap-1">
                        <div
                          className={cn(
                            'size-8 shrink-0 relative flex items-center justify-center text-muted-foreground/80',
                          )}
                        >
                          {fileItem.status === 'uploading' ? (
                            <div className="relative">
                              <svg className="size-8 -rotate-90" viewBox="0 0 32 32">
                                <circle
                                  cx="16"
                                  cy="16"
                                  r="14"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  className="text-muted-foreground/20"
                                />
                                <circle
                                  cx="16"
                                  cy="16"
                                  r="14"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeDasharray={`${2 * Math.PI * 14}`}
                                  strokeDashoffset={`${2 * Math.PI * 14 * (1 - fileItem.progress / 100)}`}
                                  className="text-primary transition-all duration-300"
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                {getFileIcon(fileItem.file)}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              {getFileIcon(fileItem.file)}
                            </div>
                          )}
                        </div>
                        <p className="flex items-center gap-1 truncate text-sm font-medium">
                          {fileItem.file.name}
                          {fileItem.status === 'error' && (
                            <Badge variant="destructive">
                              Error
                            </Badge>
                          )}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="secondary" className="text-xs">
                        {getFileTypeLabel(fileItem.file)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-sm text-muted-foreground">
                      {formatBytes(fileItem.file.size)}
                    </TableCell>
                    <TableCell className="py-2 pe-1">
                      <div className="flex items-center gap-1">
                        {fileItem.preview && fileItem.status === 'completed' && (
                          <Button variant="ghost" size="icon" className="size-8 h-8 w-8" asChild>
                            <a href={fileItem.preview} target="_blank" rel="noopener noreferrer" download>
                              <Download className="size-3.5" />
                            </a>
                          </Button>
                        )}
                        {fileItem.status === 'error' ? (
                          <Button
                            onClick={() => retryUpload(fileItem.id)}
                            variant="ghost"
                            size="icon"
                            className="size-8 h-8 w-8 text-destructive/80 hover:text-destructive"
                          >
                            <RefreshCwIcon className="size-3.5" />
                          </Button>
                        ) : (
                          <Button
                            onClick={() => removeUploadFile(fileItem.id)}
                            variant="ghost"
                            size="icon"
                            className="size-8 h-8 w-8"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <Alert variant="destructive" className="mt-5">
          <TriangleAlert />
          <AlertTitle>{tDocs('fileUploadError') || 'File upload error(s)'}</AlertTitle>
          <AlertDescription>
            {errors.map((error, index) => (
              <p key={index} className="last:mb-0">
                {error}
              </p>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
