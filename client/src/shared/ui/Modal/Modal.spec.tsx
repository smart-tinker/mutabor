import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import Modal from './Modal';

describe('Modal Component', () => {
  const mockOnClose = vi.fn();
  const modalTitle = 'Test Modal Title';
  const modalChildText = 'This is the modal content.';

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  afterEach(() => {
    cleanup(); // Clean up DOM after each test
  });

  test('renders null when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={mockOnClose} title={modalTitle}>
        <p>{modalChildText}</p>
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(modalTitle)).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  test('renders correctly with title and children when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={modalTitle}>
        <p>{modalChildText}</p>
      </Modal>
    );
    expect(screen.getByRole('dialog', { name: modalTitle })).toBeVisible();
    expect(screen.getByText(modalChildText)).toBeVisible();
    expect(screen.getByRole('button', { name: /close modal/i })).toBeVisible();
  });

  test('renders correctly without title when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <p>{modalChildText}</p>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.queryByText(modalTitle)).not.toBeInTheDocument();
    expect(screen.getByText(modalChildText)).toBeVisible();
  });


  test('calls onClose when the close button is clicked', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={modalTitle}>
        <p>{modalChildText}</p>
      </Modal>
    );
    fireEvent.click(screen.getByRole('button', { name: /close modal/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when the backdrop is clicked', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={modalTitle}>
        <p>{modalChildText}</p>
      </Modal>
    );
    const dialogElement = screen.getByRole('dialog', { name: modalTitle });
    if (dialogElement.parentElement) {
      fireEvent.click(dialogElement.parentElement);
    } else {
      throw new Error("Dialog parent element (backdrop) not found");
    }
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('does not call onClose when the modal content (dialog itself) is clicked', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={modalTitle}>
        <p>{modalChildText}</p>
      </Modal>
    );
    fireEvent.click(screen.getByRole('dialog', { name: modalTitle }));
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('does not call onClose when a child element within modal content is clicked', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={modalTitle}>
        <p>{modalChildText}</p>
      </Modal>
    );
    fireEvent.click(screen.getByText(modalChildText));
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('calls onClose when the Escape key is pressed', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={modalTitle}>
        <p>{modalChildText}</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('renders children correctly', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title={modalTitle}>
        <div>
          <span>{modalChildText}</span>
          <button>Another Action</button>
        </div>
      </Modal>
    );
    expect(screen.getByText(modalChildText)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Another Action' })).toBeInTheDocument();
  });

  test('manages document event listener for Escape key correctly', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { rerender, unmount } = render( // Use unmount from render
      <Modal isOpen={true} onClose={mockOnClose} title="Esc Test">
        Content
      </Modal>
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    const escapeKeyHandler = addEventListenerSpy.mock.calls.find(call => call[0] === 'keydown')[1];

    rerender(
      <Modal isOpen={false} onClose={mockOnClose} title="Esc Test">
        Content
      </Modal>
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', escapeKeyHandler);

    rerender(
      <Modal isOpen={true} onClose={mockOnClose} title="Esc Test">
        Content
      </Modal>
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    const newEscapeKeyHandler = addEventListenerSpy.mock.calls.reverse().find(call => call[0] === 'keydown')[1];

    unmount(); // Call unmount
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', newEscapeKeyHandler);

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });
});
