import { create } from 'zustand';

interface ImageState {
  imageFile: File | null;
  previewUrl: string | null;
  metadata: any | null; // <-- Aquí guardaremos el JSON de la foto
  isExtracting: boolean; // <-- Para saber si exifr está trabajando
  setImage: (file: File) => void;
  setMetadata: (data: any | null) => void;
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
        metadata: null, // Limpiamos los datos de la foto anterior
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
