import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResourceTypeSelector } from '../components/upload/ResourceTypeSelector';

describe('ResourceTypeSelector', () => {
  it('renders all resource type options', () => {
    render(<ResourceTypeSelector value="notes" onChange={() => {}} />);

    expect(screen.getByText('Lecture Notes')).toBeInTheDocument();
    expect(screen.getByText('Past Papers / PYQs')).toBeInTheDocument();
    expect(screen.getByText('Study Guide (PDF)')).toBeInTheDocument();
    expect(screen.getByText('Lab Manual / Code')).toBeInTheDocument();
    expect(screen.getByText('Reference Paper')).toBeInTheDocument();
  });

  it('triggers onChange when user chooses a type', () => {
    const handleChange = vi.fn();
    render(<ResourceTypeSelector value="notes" onChange={handleChange} />);

    const pyqOption = screen.getByRole('button', { name: /Past Papers \/ PYQs/i });
    fireEvent.click(pyqOption);

    expect(handleChange).toHaveBeenCalledWith('question_bank');
  });
});
