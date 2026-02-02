import { articleService } from '@/services/articleService';
import api from '@/lib/api';

jest.mock('@/lib/api');

describe('Article Service', () => {
  const mockArticle = {
    id: 1,
    title: 'Test Article',
    author: 'Test Author',
    content: 'Test content',
    category_id: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all articles', async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: [mockArticle],
      });

      const articles = await articleService.getAll();

      expect(api.get).toHaveBeenCalledWith('/api/v1/content/articles');
      expect(articles).toEqual([mockArticle]);
    });

    it('should fetch articles with filters', async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: [mockArticle],
      });

      await articleService.getAll({ language: 'en', type: 'foreign' });

      expect(api.get).toHaveBeenCalledWith('/api/v1/content/articles', {
        params: { language: 'en', type: 'foreign' },
      });
    });
  });

  describe('getById', () => {
    it('should fetch article by id', async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: mockArticle,
      });

      const article = await articleService.getById(1);

      expect(api.get).toHaveBeenCalledWith('/api/v1/content/articles/1');
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
        category_id: 1,
      };

      const result = await articleService.create(newArticle);

      expect(api.post).toHaveBeenCalledWith('/api/v1/content/articles', newArticle);
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

      expect(api.put).toHaveBeenCalledWith('/api/v1/content/articles/1', {
        title: 'Updated Title',
      });
      expect(result).toEqual(updatedArticle);
    });
  });

  describe('delete', () => {
    it('should delete an article', async () => {
      (api.delete as jest.Mock).mockResolvedValue({});

      await articleService.delete(1);

      expect(api.delete).toHaveBeenCalledWith('/api/v1/content/articles/1');
    });
  });
});
