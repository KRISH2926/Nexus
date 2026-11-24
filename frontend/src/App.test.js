import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('./components/landing/ConnectedMotionCanvas', () => ({
  __esModule: true,
  default: () => null
}));

test('renders the connected-campus hero and navigation', async () => {
  render(<App />);
  const heading = await screen.findByRole('heading', { level: 1, name: /everything on campus.*finally, in sync/i });
  expect(heading).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /luminous particle NEXUS wordmark/i })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'See how it works' })).toHaveAttribute('href', '#hero-visual');
});

test('mobile navigation opens and closes after choosing a destination', async () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
  expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Close navigation' })).toHaveAttribute('aria-expanded', 'true');

  fireEvent.click(screen.getByRole('navigation', { name: 'Mobile navigation' }).querySelector('a[href="#experiences"]'));

  await waitFor(() => {
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument();
  });
  expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveFocus();
});

test('homepage navigation destinations are present in the complete story', () => {
  render(<App />);

  ['platform', 'experiences', 'workflow', 'about'].forEach((sectionId) => {
    expect(document.getElementById(sectionId)).toBeInTheDocument();
  });
});

test('role selector changes the product preview', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /campus security/i }));

  expect(await screen.findByText('Every exit, properly checked.')).toBeInTheDocument();
  expect(screen.getByText('PASS CHECK / READY')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /campus security/i })).toHaveAttribute('aria-pressed', 'true');
});

test('FAQ clarifies that approvals happen inside NEXUS', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /does NEXUS require paid messaging services/i }));

  expect(screen.getByText(/core approval process works inside NEXUS/i)).toBeVisible();
});
