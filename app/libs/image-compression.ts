/**
 * Kompresi gambar di sisi klien menggunakan Canvas API
 * Berguna untuk mengurangi ukuran payload sebelum dikirim ke server
 */
export async function compressImage(
  file: File,
  quality: number = 0.7,
  maxWidth: number = 1200
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Jika bukan gambar, kembalikan file asli
    if (!file.type.startsWith("image/")) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Hitung rasio aspek jika lebar melebihi batas
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file); // Fallback ke file asli jika canvas gagal
        }

        // Gambar ulang ke canvas dengan dimensi baru
        ctx.drawImage(img, 0, 0, width, height);

        // Konversi canvas ke Blob dengan kualitas yang ditentukan
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Bungkus kembali menjadi File
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file); // Fallback
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

/**
 * Kompresi banyak gambar sekaligus (bulk)
 */
export async function compressImagesBulk(
  files: File[],
  quality: number = 0.7,
  maxWidth: number = 1200
): Promise<File[]> {
  const promises = files.map((file) => compressImage(file, quality, maxWidth));
  return Promise.all(promises);
}
