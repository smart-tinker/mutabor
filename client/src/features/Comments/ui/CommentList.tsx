// client/src/features/Comments/ui/CommentList.tsx
import React from 'react';
// ### ИЗМЕНЕНИЕ: Импортируем типы из правильного места ###
import type { CommentDto } from '../../../shared/api/types';
import CommentItem from './CommentItem';
import styles from './CommentList.module.css';

interface CommentListProps {
  comments: CommentDto[];
}

const CommentList: React.FC<CommentListProps> = ({ comments }) => {
  if (comments.length === 0) {
    return <p>No comments yet.</p>;
  }
  return (
    <div className={styles.commentList}>
      {comments.map(comment => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
};
export default CommentList;