export interface StorageService {
  uploadFile(file: Buffer, filename: string, mimeType: string): Promise<string>;
  deleteFile(fileUrl: string): Promise<void>;
}

export class LocalStorageService implements StorageService {
  async uploadFile(_file: Buffer, filename: string, _mimeType: string): Promise<string> {
    // Development placeholder link
    return `/uploads/${Date.now()}-${filename}`;
  }

  async deleteFile(_fileUrl: string): Promise<void> {
    return;
  }
}

export const storageService: StorageService = new LocalStorageService();
