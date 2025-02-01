import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import Chat from './Chat';

describe('handleSend', () => {
  it('sends a message', async () => {
    render(<Chat />);

    fireEvent.change(screen.getByPlaceholderText('Type your message here...'), {
      target: { value: 'Test message' },
    });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => screen.getByText('Test message'));

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  // Add more tests for other scenarios and edge cases here
});

// Add more describe blocks for other functions here
