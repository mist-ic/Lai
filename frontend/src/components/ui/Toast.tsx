import React from 'react';
import toast, { Toaster as HotToaster } from 'react-hot-toast';

export const Toaster = () => {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#333',
          color: '#fff',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#4aed88',
            secondary: '#333',
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#ff4b4b',
            secondary: '#333',
          },
        },
      }}
    />
  );
};

export const toastSuccess = (message: string) => {
  toast.success(message);
};

export const toastError = (message: string) => {
  toast.error(message);
};

export const toastInfo = (message: string) => {
  toast(message, {
    icon: 'ℹ️',
  });
};
