import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from '../card';

describe('Card', () => {
  it('renders a card with the correct text', () => {
    render(<Card>My Card</Card>);
    const card = screen.getByText(/my card/i);
    expect(card).toBeInTheDocument();
  });

  it('renders a card with a header', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>My Title</CardTitle>
        </CardHeader>
      </Card>
    );
    const title = screen.getByText(/my title/i);
    expect(title).toBeInTheDocument();
  });

  it('renders a card with a footer', () => {
    render(
      <Card>
        <CardFooter>My Footer</CardFooter>
      </Card>
    );
    const footer = screen.getByText(/my footer/i);
    expect(footer).toBeInTheDocument();
  });

  it('renders a card with a description', () => {
    render(
      <Card>
        <CardHeader>
          <CardDescription>My Description</CardDescription>
        </CardHeader>
      </Card>
    );
    const description = screen.getByText(/my description/i);
    expect(description).toBeInTheDocument();
  });

  it('renders a card with content', () => {
    render(
      <Card>
        <CardContent>My Content</CardContent>
      </Card>
    );
    const content = screen.getByText(/my content/i);
    expect(content).toBeInTheDocument();
  });

  it('renders a card with an action', () => {
    render(
      <Card>
        <CardHeader>
          <CardAction>My Action</CardAction>
        </CardHeader>
      </Card>
    );
    const action = screen.getByText(/my action/i);
    expect(action).toBeInTheDocument();
  });
});
