import React from 'react';
import { render, screen } from '@testing-library/react';
import { Label } from '../label';

describe('Label', () => {
  it('renders a label with the correct text', () => {
    render(<Label>My Label</Label>);
    const label = screen.getByText(/my label/i);
    expect(label).toBeInTheDocument();
  });

  it('applies the correct class', () => {
    render(<Label className="my-class">My Label</Label>);
    const label = screen.getByText(/my label/i);
    expect(label).toHaveClass('my-class');
  });
});
