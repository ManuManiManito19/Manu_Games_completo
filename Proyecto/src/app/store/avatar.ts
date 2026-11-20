const avatarPattern = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;

export function isUploadedAvatar(value: string): boolean {
  return value.length <= 16000 && avatarPattern.test(value);
}

export async function encodeAvatar(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error('Selecciona una imagen JPG, PNG o WebP de hasta 5 MB.');
  }
  const image = await createImageBitmap(file).catch(() => {
    throw new Error('No se pudo abrir la imagen seleccionada.');
  });
  try {
    const canvas = document.createElement('canvas');
    const side = Math.min(image.width, image.height);
    canvas.width = canvas.height = Math.min(128, side);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Tu navegador no pudo preparar la imagen.');
    context.fillStyle = '#141414';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side,
      0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.66, 0.42]) {
      const avatar = canvas.toDataURL('image/jpeg', quality);
      if (isUploadedAvatar(avatar)) return avatar;
    }
    throw new Error('No se pudo preparar la imagen. Prueba con otra.');
  } finally {
    image.close();
  }
}
