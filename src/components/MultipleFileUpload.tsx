import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, FileIcon, ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface FileWithPreview {
  file: File;
  preview?: string;
  type: 'imagen' | 'documento' | 'video';
}

interface MultipleFileUploadProps {
  files: FileWithPreview[];
  onFilesChange: (files: FileWithPreview[]) => void;
  maxFiles?: number;
  acceptImages?: boolean;
  acceptDocuments?: boolean;
  label?: string;
}

export function MultipleFileUpload({
  files,
  onFilesChange,
  maxFiles = 10,
  acceptImages = true,
  acceptDocuments = true,
  label = "Archivos"
}: MultipleFileUploadProps) {
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles = Array.from(selectedFiles);
    const totalFiles = files.length + newFiles.length;

    if (totalFiles > maxFiles) {
      return;
    }

    const filesWithPreview: FileWithPreview[] = [];
    
    newFiles.forEach(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const fileWithPreview: FileWithPreview = {
        file,
        type: isImage ? 'imagen' : (isVideo ? 'video' : 'documento')
      };

      if (isImage) {
        const reader = new FileReader();
        reader.onloadend = () => {
          fileWithPreview.preview = reader.result as string;
          onFilesChange([...files, ...filesWithPreview]);
        };
        reader.readAsDataURL(file);
      } else {
        filesWithPreview.push(fileWithPreview);
      }
    });

    if (filesWithPreview.length > 0) {
      onFilesChange([...files, ...filesWithPreview]);
    }
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const getAcceptString = () => {
    const accepts = [];
    if (acceptImages) accepts.push('image/*');
    if (acceptDocuments) accepts.push('.pdf,.doc,.docx,.xls,.xlsx');
    accepts.push('video/*');
    return accepts.join(',');
  };

  return (
    <div className="space-y-2">
      <Label>{label} (máximo {maxFiles})</Label>
      <Input
        type="file"
        accept={getAcceptString()}
        multiple
        onChange={handleFileChange}
        disabled={files.length >= maxFiles}
      />
      
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
          {files.map((fileWithPreview, index) => (
            <Card key={index} className="relative group p-2">
              {fileWithPreview.type === 'imagen' && fileWithPreview.preview ? (
                <div className="relative">
                  <img
                    src={fileWithPreview.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : fileWithPreview.type === 'video' ? (
                <div className="relative">
                  <video
                    src={URL.createObjectURL(fileWithPreview.file)}
                    className="w-full h-24 object-cover rounded-md"
                    controls
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-24 relative">
                  <FileIcon className="h-8 w-8 text-muted-foreground mb-1" />
                  <p className="text-xs text-center truncate w-full px-2">
                    {fileWithPreview.file.name}
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}