import { render, screen } from '@testing-library/react';
import EmptyState from '@/components/EmptyState';

describe('EmptyState', () => {
  it('renders default title', () => {
    render(<EmptyState />);
    expect(screen.getByText('Hiç zat tapylmady')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<EmptyState title="Custom title" />);
    expect(screen.getByText('Custom title')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState description="Some description" />);
    expect(screen.getByText('Some description')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(<EmptyState />);
    const description = screen.queryByText('Some description');
    expect(description).not.toBeInTheDocument();
  });
});
