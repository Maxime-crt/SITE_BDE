import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StarRating from '../StarRating';

describe('StarRating Component', () => {
  it('should render 5 stars', () => {
    const { container } = render(<StarRating rating={0} />);
    const stars = container.querySelectorAll('button');
    expect(stars.length).toBe(5);
  });

  it('should display filled stars based on rating', () => {
    const { container } = render(<StarRating rating={3} />);
    const stars = container.querySelectorAll('svg');

    // First 3 stars should be filled (yellow)
    expect(stars[0].classList.contains('fill-yellow-400')).toBe(true);
    expect(stars[1].classList.contains('fill-yellow-400')).toBe(true);
    expect(stars[2].classList.contains('fill-yellow-400')).toBe(true);

    // Last 2 stars should be unfilled (gray)
    expect(stars[3].classList.contains('text-gray-300')).toBe(true);
    expect(stars[4].classList.contains('text-gray-300')).toBe(true);
  });

  it('should call onRatingChange when a star is clicked', () => {
    const handleRatingChange = vi.fn();
    const { container } = render(
      <StarRating rating={0} onRatingChange={handleRatingChange} />
    );

    const stars = container.querySelectorAll('button');
    fireEvent.click(stars[2]); // Click third star

    expect(handleRatingChange).toHaveBeenCalledWith(3);
  });

  it('should not call onRatingChange when readonly', () => {
    const handleRatingChange = vi.fn();
    const { container } = render(
      <StarRating rating={3} onRatingChange={handleRatingChange} readonly />
    );

    const stars = container.querySelectorAll('button');
    fireEvent.click(stars[4]); // Try to click fifth star

    expect(handleRatingChange).not.toHaveBeenCalled();
  });

  it('should show hover state on non-readonly rating', () => {
    const { container } = render(<StarRating rating={2} />);
    const stars = container.querySelectorAll('button');

    fireEvent.mouseEnter(stars[3]); // Hover over fourth star

    // After hover, 4 stars should appear filled
    const svgs = container.querySelectorAll('svg');
    expect(svgs[3].classList.contains('fill-yellow-400')).toBe(true);
  });

  it('should render correct size classes', () => {
    const { container: smallContainer } = render(<StarRating rating={3} size="sm" />);
    const { container: mediumContainer } = render(<StarRating rating={3} size="md" />);
    const { container: largeContainer } = render(<StarRating rating={3} size="lg" />);

    expect(smallContainer.querySelector('.w-4')).toBeTruthy();
    expect(mediumContainer.querySelector('.w-5')).toBeTruthy();
    expect(largeContainer.querySelector('.w-6')).toBeTruthy();
  });
});
