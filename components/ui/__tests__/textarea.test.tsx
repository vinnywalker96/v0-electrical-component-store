import React from 'react';
import { render, screen } from '@testing-library/react';
import { Textarea } from '../textarea';

describe('Textarea', () => {
  it('renders a textarea', () => {
    render(<Textarea />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('applies the correct class', () => {
    render(<Textarea className="my-class" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('my-class');
  });

  it('is disabled when the disabled prop is true', () => {
    render(<Textarea disabled />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });
});
