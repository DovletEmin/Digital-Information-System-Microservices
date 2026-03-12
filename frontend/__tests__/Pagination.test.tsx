import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from '@/components/Pagination';

describe('Pagination', () => {
  it('renders nothing when totalPages <= 1', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders page buttons', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={jest.fn()} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onPageChange with correct page when button clicked', () => {
    const handleChange = jest.fn();
    render(<Pagination page={1} totalPages={5} onPageChange={handleChange} />);
    fireEvent.click(screen.getByText('3'));
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it('disables "previous" button on first page', () => {
    render(<Pagination page={1} totalPages={5} onPageChange={jest.fn()} />);
    const prevButton = screen.getByLabelText('Öňki sahypa');
    expect(prevButton).toBeDisabled();
  });

  it('disables "next" button on last page', () => {
    render(<Pagination page={5} totalPages={5} onPageChange={jest.fn()} />);
    const nextButton = screen.getByLabelText('Indiki sahypa');
    expect(nextButton).toBeDisabled();
  });

  it('calls onPageChange with next page on next click', () => {
    const handleChange = jest.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={handleChange} />);
    fireEvent.click(screen.getByLabelText('Indiki sahypa'));
    expect(handleChange).toHaveBeenCalledWith(3);
  });
});
