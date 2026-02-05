import api from '@/lib/api';

export const ratingService = {
  setRating: async (payload: { contentType: 'article' | 'book' | 'dissertation'; contentId: number; rating: number }) => {
    const { data } = await api.post('/api/v1/ratings', {
      contentType: payload.contentType,
      contentId: payload.contentId,
      rating: payload.rating,
    });
    return data;
  },

  getMyRating: async (contentType: 'article' | 'book' | 'dissertation', contentId: number) => {
    const { data } = await api.get(`/api/v1/ratings/my/${contentType}/${contentId}`);
    return data;
  },

  getStats: async (contentType: 'article' | 'book' | 'dissertation', contentId: number) => {
    const { data } = await api.get(`/api/v1/ratings/stats/${contentType}/${contentId}`);
    return data;
  },

  deleteRating: async (contentType: 'article' | 'book' | 'dissertation', contentId: number) => {
    const { data } = await api.delete(`/api/v1/ratings/${contentType}/${contentId}`);
    return data;
  },
};
