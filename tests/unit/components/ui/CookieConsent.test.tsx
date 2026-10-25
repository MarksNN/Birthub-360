import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieConsent } from '../../../../src/components/ui/CookieConsent.js';

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders correctly when no consent is set', () => {
    render(
      <BrowserRouter>
        <CookieConsent />
      </BrowserRouter>,
    );

    expect(screen.getByText(/Nós usamos cookies/i)).toBeInTheDocument();
  });

  it('does not render if consent is already accepted', () => {
    localStorage.setItem('birthhub360_cookie_consent', 'accepted');

    render(
      <BrowserRouter>
        <CookieConsent />
      </BrowserRouter>,
    );

    expect(screen.queryByText(/Nós usamos cookies/i)).not.toBeInTheDocument();
  });

  it('hides the banner and saves to localStorage when accepting', () => {
    render(
      <BrowserRouter>
        <CookieConsent />
      </BrowserRouter>,
    );

    const acceptButton = screen.getByText('Aceitar');
    fireEvent.click(acceptButton);

    expect(localStorage.getItem('birthhub360_cookie_consent')).toBe('accepted');
  });
});
