import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/test-utils';

// Simple button component test example
describe('Button Component', () => {
  it('should render button with text', () => {
    render(<button>Click me</button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should call onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<button onClick={handleClick}>Click me</button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<button disabled>Click me</button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
