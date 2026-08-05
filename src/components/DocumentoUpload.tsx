import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, ExternalLink, X, FileText } from "lucide-react";

interface DocumentoUploadProps {
  value: string;
  onChange: (value: string) => void;
  folder: string;
  contratoFolio: string;
  bucket?: string;
}

export function DocumentoUpload({
  value,
  onChange,
  folder,
  contratoFolio,
  bucket = "contratos",
}: DocumentoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState(false);
  const { toast } = useToast();

  const isExternal = value.startsWith("http");
  const fileName = value ? value.split("/").pop() : "";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El tamaño máximo permitido es 50MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const safeFolio = contratoFolio.replace(/[^a-zA-Z0-9-_]/g, "_");
      const path = `${folder}/${safeFolio}-${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true, contentType: file.type || undefined });

      if (error) throw error;

      onChange(path);
      toast({ title: "Archivo subido", description: file.name });
    } catch (err: any) {
      toast({
        title: "Error al subir",
        description: err?.message || "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleOpen = async () => {
    if (!value) return;
    if (isExternal) {
      window.open(value, "_blank");
      return;
    }
    setOpening(true);
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(value, 3600);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      toast({
        title: "No se pudo abrir el archivo",
        description: err?.message || "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={handleUpload}
      />

      {value ? (
        <div className="flex items-center gap-2 rounded-md border p-2">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-sm">{fileName}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpen}
            disabled={opening}
          >
            {opening ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {uploading ? "Subiendo..." : "Subir archivo"}
        </Button>
      )}
    </div>
  );
}
