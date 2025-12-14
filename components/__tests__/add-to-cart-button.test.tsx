import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddToCartButton } from '../add-to-cart-button';
import { useRouter } from 'next/navigation';

const mockAddToCart = jest.fn();
const mockGetUser = jest.fn();
const mockPush = jest.fn();

// Mock useRouter from next/navigation (this seems to work fine)
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the modules that use the aliased paths
jest.mock('../../lib/context/cart-context', () => ({
  useCart: () => ({
    addToCart: mockAddToCart,
  }),
}));

jest.mock('../../lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));


describe('AddToCartButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the button', () => {
    render(<AddToCartButton productId="1" />);
    const button = screen.getByRole('button', { name: /add to cart/i });
    expect(button).toBeInTheDocument();
  });

  it('calls addToCart when clicked and user is logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } } });
    render(<AddToCartButton productId="1" />);
    const button = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(button);
    await waitFor(() => expect(mockAddToCart).toHaveBeenCalledWith('1', 1));
  });

  it('redirects to login when user is not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    render(<AddToCartButton productId="1" />);
    const button = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(button);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/auth/login'));
  });

  it('shows "Adding..." text when loading', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } } });
    mockAddToCart.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<AddToCartButton productId="1" />);
    const button = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(button);
    expect(screen.getByText(/adding.../i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/adding.../i)).not.toBeInTheDocument());
  });

  it('shows "Added to cart!" message on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } } });
    render(<AddToCartButton productId="1" />);
    const button = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByText(/added to cart!/i)).toBeInTheDocument());
  });
});
