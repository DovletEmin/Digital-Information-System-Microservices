import { render, screen, fireEvent } from '@testing-library/react';
import BookCard from '@/components/BookCard';
import { Book } from '@/types';

const mockBook: Book = {
  id: 1,
  title: 'Test Book Title',
  author: 'Test Author',
  authors_workplace: 'Test University',
  description: 'A test description',
  content: '',
  thumbnail: undefined,
  pdf_file_url: undefined,
  epub_file_url: undefined,
  language: 'tm',
  type: 'local',
  publication_date: '2024-01-15',
  views: 100,
  rating: 0,
  average_rating: 4.5,
  rating_count: 10,
  categories: [],
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

describe('BookCard', () => {
  it('renders book title', () => {
    render(<BookCard book={mockBook} />);
    expect(screen.getByText('Test Book Title')).toBeInTheDocument();
  });

  it('renders book author', () => {
    render(<BookCard book={mockBook} />);
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('renders rating', () => {
    render(<BookCard book={mockBook} />);
    expect(screen.getByText(/4\.5/)).toBeInTheDocument();
  });

  it('renders fallback icon when no thumbnail', () => {
    const bookWithoutThumbnail = { ...mockBook, thumbnail: null };
    render(<BookCard book={bookWithoutThumbnail} />);
    // Book icon SVG is rendered instead of an image
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('calls onSaveToggle when save button is clicked', () => {
    const handleSaveToggle = jest.fn();
    render(<BookCard book={mockBook} isSaved={false} onSaveToggle={handleSaveToggle} />);
    const saveButton = screen.getByLabelText('Save');
    fireEvent.click(saveButton);
    expect(handleSaveToggle).toHaveBeenCalledWith(true);
  });

  it('calls onSaveToggle with false when already saved', () => {
    const handleSaveToggle = jest.fn();
    render(<BookCard book={mockBook} isSaved={true} onSaveToggle={handleSaveToggle} />);
    const saveButton = screen.getByLabelText('Remove from saved');
    fireEvent.click(saveButton);
    expect(handleSaveToggle).toHaveBeenCalledWith(false);
  });

  it('links to the correct book detail page', () => {
    render(<BookCard book={mockBook} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/books/1');
  });
});
