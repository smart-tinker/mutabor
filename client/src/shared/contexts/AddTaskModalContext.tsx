import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AddTaskModalContextType {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const AddTaskModalContext = createContext<AddTaskModalContextType | undefined>(undefined);

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
// If a standalone Provider component was desired, it would look something like this:
/*
export const AddTaskModalProvider = ({ children }: { children: ReactNode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // These would be generic open/close functions.
  // The specific logic for what happens on open (like pre-selecting a column in BoardPage)
  // would either need to be passed into this provider, or this provider would be
  // more tightly coupled with BoardPage's specific needs if it were to manage that.
  // For this exercise, BoardPage will provide these functions directly.
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <AddTaskModalContext.Provider value={{ isModalOpen, openModal, closeModal }}>
      {children}
    </AddTaskModalContext.Provider>
  );
};
*/
