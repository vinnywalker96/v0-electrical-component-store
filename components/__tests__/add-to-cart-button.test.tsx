import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AddToCartButton } from '../add-to-cart-button';
import { useRouter } from 'next/navigation';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { thunk } from 'redux-thunk';

const middlewares = [thunk];
const mockStore = configureStore(middlewares);

const mockPush = jest.fn();
const mockGetUser = jest.fn();

// Mock useRouter from next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
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
  let store;

  beforeEach(() => {
    store = mockStore({});
    jest.clearAllMocks();
  });

  it('renders the button', () => {
    render(
      <Provider store={store}>
        <AddToCartButton productId="1" />
      </Provider>
    );
    const button = screen.getByRole('button', { name: /add to cart/i });
    expect(button).toBeInTheDocument();
  });

  it('dispatches addToCart action when clicked and user is logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } } });
    render(
      <Provider store={store}>
        <AddToCartButton productId="1" />
      </Provider>
    );
    const button = screen.getByRole('button', { name: /add to cart/i });
    await act(async () => {
      fireEvent.click(button);
    });
    const actions = store.getActions();
    expect(actions[0].type).toBe('cart/addToCart/pending');
  });

  it('redirects to login when user is not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    render(
      <Provider store={store}>
        <AddToCartButton productId="1" />
      </Provider>
    );
    const button = screen.getByRole('button', { name: /add to cart/i });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(mockPush).toHaveBeenCalledWith('/auth/login');
  });

  it('shows "Adding..." text when loading', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } } });
    render(
      <Provider store={store}>
        <AddToCartButton productId="1" />
      </Provider>
    );
    const button = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(button);
    await screen.findByText(/adding.../i);
  });

  it('shows "Added to cart!" message on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } } });
    render(
      <Provider store={store}>
        <AddToCartButton productId="1" />
      </Provider>
    );
    const button = screen.getByRole('button', { name: /add to cart/i });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(screen.getByText(/added to cart!/i)).toBeInTheDocument();
  });
});
