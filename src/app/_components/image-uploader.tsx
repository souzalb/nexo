'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { IconUpload, IconLoader, IconCircleCheck } from '@tabler/icons-react';
import { Button } from './ui/button';

interface ImageUploaderProps {
  onUploadSuccess: (url: string) => void;
}

export function ImageUploader({ onUploadSuccess }: ImageUploaderProps) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success'>(
    'idle',
  );

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus('uploading');
    toast.loading('A carregar imagem...');

    try {
      // 1. Obter a assinatura do nosso backend
      const timestamp = Math.round(new Date().getTime() / 1000);
      const paramsToSign = { timestamp };

      const signatureResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paramsToSign }),
      });
      const { signature } = await signatureResponse.json();
      if (!signature) throw new Error('Falha ao obter assinatura do servidor.');

      // 2. Preparar os dados para enviar ao Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!);
      formData.append('timestamp', String(timestamp));
      formData.append('signature', signature);

      // 3. Enviar o ficheiro diretamente para a API do Cloudinary
      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        },
      );

      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok)
        throw new Error(
          uploadData.error?.message || 'Falha no upload para o Cloudinary.',
        );

      // 4. Sucesso!
      toast.dismiss();
      toast.success('Imagem carregada com sucesso!');
      setStatus('success');
      onUploadSuccess(uploadData.secure_url); // Devolve o URL seguro
    } catch (error) {
      toast.dismiss();
      toast.error((error as Error).message);
      setStatus('idle');
    }
  };

  return (
    <div>
      <label
        htmlFor="file-upload"
        className="block text-sm font-medium text-gray-700 dark:text-gray-100"
      >
        Adicionar nova imagem
      </label>
      <div className="mt-1 flex items-center gap-4">
        <Button asChild variant="outline">
          <label htmlFor="file-upload" className="cursor-pointer">
            {status === 'idle' && (
              <>
                <IconUpload size={18} className="mr-2" /> Escolher ficheiro
              </>
            )}
            {status === 'uploading' && (
              <>
                <IconLoader size={18} className="mr-2 animate-spin" /> A
                carregar...
              </>
            )}
            {status === 'success' && (
              <>
                <IconCircleCheck size={18} className="mr-2 text-green-500" />{' '}
                Sucesso!
              </>
            )}
          </label>
        </Button>
        <input
          id="file-upload"
          name="file-upload"
          type="file"
          className="sr-only"
          onChange={handleFileChange}
          accept="image/*"
          disabled={status === 'uploading'}
        />
        <p className="text-xs text-gray-500 dark:text-gray-300">
          PNG, JPG, GIF até 10MB
        </p>
      </div>
    </div>
  );
}
