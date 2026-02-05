import api from '@/lib/api';

export type ViewContentType = 'article' | 'book' | 'dissertation';

export const viewService = {
  recordView: async (contentType: ViewContentType, contentId: number) => {
    try {
      await api.post('/api/v1/views', { contentType, contentId });
    } catch {
      // ignore
    }
  },
};
