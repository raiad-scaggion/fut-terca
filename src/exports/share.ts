function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Opens the phone's share sheet, or downloads the file where sharing files isn't supported.
export async function shareImage(blob: Blob, fileName: string, title: string) {
  const file = new File([blob], fileName, { type: blob.type });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return;
      }
    }
  }

  download(blob, fileName);
}
