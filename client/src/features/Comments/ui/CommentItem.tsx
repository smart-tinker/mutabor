// client/src/features/Comments/ui/CommentItem.tsx
import React from 'react';
import type { CommentDto } from '../../../shared/api/taskService';
import styles from './CommentItem.module.css';

interface CommentItemProps {
  comment: CommentDto;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment }) => {
  return (
    <div className={styles.commentItem}>
      <div className={styles.commentAuthor}>
        {comment.author?.name || comment.author?.email || 'Anonymous'}
      </div>
      <p className={styles.commentText}>{comment.text}</p>
      <div className={styles.commentTimestamp}>
        {(() => {
          const date = new Date(comment.createdAt);
          if (isNaN(date.getTime())) {
            // console.warn('Invalid createdAt value received:', comment.createdAt); // Optional: uncomment for local debugging
            return 'Date unavailable';
          }
          return date.toLocaleString();
        })()}
      </div>
    </div>
  );
};
export default CommentItem;
