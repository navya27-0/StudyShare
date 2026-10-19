import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DuplicateWarning } from '../components/upload/DuplicateWarning';
import type { ResourceListItem } from '../types';

const mockMatch: ResourceListItem = {
  id: 42,
  topic_id: 1,
  type: 'notes',
  title: 'CS201 Trees & Graphs Lecture Notes',
  description: 'Detailed unit 3 summary',
  file_url: '/uploads/sample.pdf',
  file_size_bytes: 1024,
  page_count: 5,
  semester: 3,
  current_version_id: 1,
  upvotes_count: 12,
  downvotes_count: 0,
  rating_avg: 4.8,
  rating_count: 5,
  views_count: 50,
  downloads_count: 20,
  is_verified: true,
  is_deleted: false,
  ranking_score: 95.0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  uploader: {
    id: 10,
    display_name: 'Alex Rivera',
    avatar_url: null,
    role: 'student',
  },
};

describe('DuplicateWarning', () => {
  it('returns null if matches array is empty', () => {
    const { container } = render(
      <DuplicateWarning matches={[]} onDismiss={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders duplicate matches and responds to dismiss action', () => {
    const handleDismiss = vi.fn();
    render(
      <DuplicateWarning matches={[mockMatch]} onDismiss={handleDismiss} />
    );

    expect(
      screen.getByText(/Similar study material already exists in this course!/i)
    ).toBeInTheDocument();
    expect(screen.getByText('CS201 Trees & Graphs Lecture Notes')).toBeInTheDocument();

    const dismissButton = screen.getByLabelText(/Dismiss duplicate warning/i);
    fireEvent.click(dismissButton);

    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('triggers onSelectAsVersion when clicking publish version button', () => {
    const handleSelectVersion = vi.fn();
    render(
      <DuplicateWarning
        matches={[mockMatch]}
        onDismiss={() => {}}
        onSelectAsVersion={handleSelectVersion}
      />
    );

    const versionBtn = screen.getByRole('button', { name: /Update v/i });
    fireEvent.click(versionBtn);

    expect(handleSelectVersion).toHaveBeenCalledWith(42);
  });
});
