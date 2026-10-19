import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentFlowGuide } from '../components/browse/StudentFlowGuide';

describe('StudentFlowGuide', () => {
  it('renders all 4 student onboarding workflow steps', () => {
    render(<StudentFlowGuide />);

    expect(screen.getByText(/How to Find What You Need in 10 Seconds/i)).toBeInTheDocument();
    expect(screen.getByText('Choose Course')).toBeInTheDocument();
    expect(screen.getByText('Pick Unit')).toBeInTheDocument();
    expect(screen.getByText('Find Notes / PYQs')).toBeInTheDocument();
    expect(screen.getByText('Preview or Save')).toBeInTheDocument();
  });
});
