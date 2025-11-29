'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function NewPhotosPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!files || files.length === 0) {
      setErr('Selecione pelo menos uma imagem');
      return;
    }

    setLoading(true);
    setErr('');

    try {
      const formData = new FormData();

      // backend espera "image"
      for (let i = 0; i < files.length; i++) {
        formData.append('image', files[i]);
      }

      const res = await fetch(`${backendUrl}/spaces/${id}/photos`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      router.push(`/spaces/${id}`);
    } catch (e: any) {
      setErr(e.message || 'Erro ao enviar fotos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-8 max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">Adicionar Fotos</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label>
          <span className="font-medium">Selecione imagens:</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(e.target.files)}
          />
        </label>

        {err && <p className="text-red-600">{err}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Enviando…' : 'Enviar Fotos'}
        </button>
      </form>

      <button
        onClick={() => router.back()}
        className="mt-4 underline text-gray-600"
      >
        Voltar
      </button>
    </main>
  );
}
