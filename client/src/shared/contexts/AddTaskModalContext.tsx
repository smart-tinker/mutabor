import { createContext, useContext } from 'react';

interface AddTaskModalContextType {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const AddTaskModalContext = createContext<AddTaskModalContextType | undefined>(undefined);

export const useAddTaskModal = () => {
  const context = useContext(AddTaskModalContext);
  if (!context) {
    throw new Error('useAddTaskModal must be used within an AddTaskModalProvider');
  }
  return context;
};

// Note: The actual AddTaskModalProvider component will be implemented by integrating its logic
// into BoardPage.tsx where the state and modal control functions (open/close) already exist.
// This file primarily defines the context type and the consumer hook.
