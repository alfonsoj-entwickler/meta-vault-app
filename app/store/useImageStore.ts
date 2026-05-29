import { create } from 'zustand';
import type { ImageMetadata } from '../types/exif';

interface ImageState {
  imageFile: File | null;
  previewUrl: string | null;
  metadata: ImageMetadata | null;
  isExtracting: boolean;
  setImage: (file: File) => void;
  setMetadata: (data: ImageMetadata | null) => void;
  setIsExtracting: (status: boolean) => void;
  clearImage: () => void;
}

export const useImageStore = create<ImageState>((set) => ({
  imageFile: null,
  previewUrl: null,
  metadata: null,
  isExtracting: false,

  setImage: (file) => {
    set((state) => {
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
      return {
        imageFile: file,
        previewUrl: URL.createObjectURL(file),
        metadata: null,
      };
    });
  },

  setMetadata: (data) => set({ metadata: data }),
  setIsExtracting: (status) => set({ isExtracting: status }),

  clearImage: () => {
    set((state) => {
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
      return { imageFile: null, previewUrl: null, metadata: null, isExtracting: false };
    });
  },
}));
