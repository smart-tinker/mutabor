// client/src/features/Comments/ui/AddCommentForm.tsx
import React, { useState } from 'react';
import { addTaskComment } from '../api';
import type { CommentDto, CreateCommentPayloadDto } from '../../../shared/api/types';
import styles from './AddCommentForm.module.css';

interface AddCommentFormProps {
  taskId: string;
  onCommentAdded: (newComment: CommentDto) => void;
}

const AddCommentForm: React.FC<AddCommentFormProps> = ({ taskId, onCommentAdded }) => {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Comment cannot be empty.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: CreateCommentPayloadDto = { text };
      const newComment = await addTaskComment(taskId, payload);
      onCommentAdded(newComment);
      setText(''); // Clear textarea
    } catch (err) {
      console.error('Failed to add comment:', err);
      setError('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.addCommentForm}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment..."
        rows={3}
        disabled={isSubmitting}
        className={error ? 'input-error' : ''}
      />
      {error && <p className={styles.errorText}>{error}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Add Comment'}
      </button>
    </form>
  );
};
export default AddCommentForm;