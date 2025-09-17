import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '@/app/_lib/prisma';
import { authOptions } from '@/app/_lib/auth';

// Configura o Cloudinary com as chaves do ambiente
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Função auxiliar para extrair o public_id de um URL do Cloudinary
const getPublicIdFromUrl = (url: string): string | null => {
  try {
    const urlSegments = url.split('/');
    const uploadIndex = urlSegments.indexOf('upload');
    if (uploadIndex === -1) return null;

    // Pega as partes do URL após o número da versão
    const publicIdWithExtension = urlSegments.slice(uploadIndex + 2).join('/');
    // Remove a extensão do ficheiro
    const publicId = publicIdWithExtension.substring(
      0,
      publicIdWithExtension.lastIndexOf('.'),
    );
    return publicId;
  } catch (error) {
    console.error('Erro ao extrair public_id do URL:', error);
    return null;
  }
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    // 1. Encontrar o registo da imagem para obter o URL
    const image = await db.roomImage.findUnique({
      where: { id },
      select: { url: true },
    });

    if (!image) {
      return NextResponse.json(
        { message: 'Imagem não encontrada na base de dados.' },
        { status: 404 },
      );
    }

    // 2. Extrair o public_id do URL
    const publicId = getPublicIdFromUrl(image.url);

    // 3. Se um public_id válido for encontrado, apagar do Cloudinary
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    } else {
      // Regista um aviso se não conseguir apagar do Cloudinary, mas continua o processo
      console.warn(
        `Não foi possível extrair o public_id do URL para apagar do Cloudinary: ${image.url}`,
      );
    }

    // 4. Apagar o registo da nossa base de dados
    await db.roomImage.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 }); // Retorna sucesso sem conteúdo
  } catch (error) {
    console.error('Erro ao remover imagem:', error);
    return NextResponse.json(
      { message: 'Erro ao remover imagem.' },
      { status: 500 },
    );
  }
}
