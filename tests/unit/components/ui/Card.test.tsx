import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Card } from '@/components/ui/Card';

afterEach(cleanup);

describe('Card', () => {
  it('does not expose a non-interactive card as a landmark region', () => {
    render(<Card>Card content</Card>);

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it.each(['Enter', ' '])('activates a clickable card with %s', (key) => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>Open details</Card>);

    const card = screen.getByRole('button', { name: 'Open details' });
    fireEvent.keyDown(card, { key });

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
