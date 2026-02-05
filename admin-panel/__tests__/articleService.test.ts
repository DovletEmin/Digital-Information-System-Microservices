import { articleService } from '@/services/articleService';
import api from '@/lib/api';

jest.mock('@/lib/api');

describe('Article Service', () => {
  const mockArticle = {
    id: 1,
    title: 'Test Article',
    author: 'Test Author',
    content: 'Test content',
    category_ids: [1],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all articles', async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: {
          items: [mockArticle],
          total: 1,
          page: 1,
          per_page: 10,
          pages: 1,
        },
      });

      const articles = await articleService.getAll();

      expect(api.get).toHaveBeenCalledWith('/api/v1/articles', {
        params: { page: 1, per_page: 10 },
      });
      expect(articles).toEqual({
        items: [mockArticle],
        total: 1,
        page: 1,
        per_page: 10,
        pages: 1,
      });
    });
  });

  describe('getById', () => {
    it('should fetch article by id', async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: mockArticle,
      });

      const article = await articleService.getById(1);

      expect(api.get).toHaveBeenCalledWith('/api/v1/articles/1');
      expect(article).toEqual(mockArticle);
    });
  });

  describe('create', () => {
    it('should create a new article', async () => {
      (api.post as jest.Mock).mockResolvedValue({
        data: mockArticle,
      });

      const newArticle = {
        title: 'Test Article',
        author: 'Test Author',
        content: 'Test content',
        category_ids: [1],
      };

      const result = await articleService.create(newArticle);

      expect(api.post).toHaveBeenCalledWith('/api/v1/articles', newArticle);
      expect(result).toEqual(mockArticle);
    });
  });

  describe('update', () => {
    it('should update an article', async () => {
      const updatedArticle = { ...mockArticle, title: 'Updated Title' };
      (api.put as jest.Mock).mockResolvedValue({
        data: updatedArticle,
      });

      const result = await articleService.update(1, { title: 'Updated Title' });

      expect(api.put).toHaveBeenCalledWith('/api/v1/articles/1', {
        title: 'Updated Title',
      });
      expect(result).toEqual(updatedArticle);
    });
  });

  describe('delete', () => {
    it('should delete an article', async () => {
      (api.delete as jest.Mock).mockResolvedValue({});

      await articleService.delete(1);

      expect(api.delete).toHaveBeenCalledWith('/api/v1/articles/1');
    });
  });
});
