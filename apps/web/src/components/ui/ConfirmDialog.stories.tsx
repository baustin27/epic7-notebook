import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmDialog } from './ConfirmDialog';
import { useState } from 'react';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'UI/ConfirmDialog',
  component: ConfirmDialog,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A modal dialog component for confirmations with different types, loading states, and accessibility features.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: { type: 'boolean' },
      description: 'Whether the dialog is visible',
    },
    title: {
      control: { type: 'text' },
      description: 'Dialog title',
    },
    message: {
      control: { type: 'text' },
      description: 'Dialog message content',
    },
    confirmText: {
      control: { type: 'text' },
      description: 'Text for the confirm button',
    },
    cancelText: {
      control: { type: 'text' },
      description: 'Text for the cancel button',
    },
    type: {
      control: { type: 'select' },
      options: ['destructive', 'warning', 'info', 'success'],
      description: 'Dialog type affecting styling and icon',
    },
    isLoading: {
      control: { type: 'boolean' },
      description: 'Whether the dialog is in a loading state',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

// Interactive wrapper for stories
const InteractiveConfirmDialog = (args: any) => {
  const [isOpen, setIsOpen] = useState(args.isOpen);

  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Open Dialog
      </button>
      <ConfirmDialog
        {...args}
        isOpen={isOpen}
        onConfirm={() => {
          console.log('Confirmed!');
          setIsOpen(false);
        }}
        onCancel={() => {
          console.log('Cancelled!');
          setIsOpen(false);
        }}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
};

export const Default: Story = {
  render: (args) => <InteractiveConfirmDialog {...args} />,
  args: {
    isOpen: false,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed with this action?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'info',
    isLoading: false,
  },
};

export const Destructive: Story = {
  render: (args) => <InteractiveConfirmDialog {...args} />,
  args: {
    isOpen: false,
    title: 'Delete Item',
    message: 'This action cannot be undone. Are you sure you want to delete this item?',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    type: 'destructive',
    isLoading: false,
  },
};

export const Warning: Story = {
  render: (args) => <InteractiveConfirmDialog {...args} />,
  args: {
    isOpen: false,
    title: 'Warning',
    message: 'This action may have unintended consequences. Please review carefully.',
    confirmText: 'Proceed',
    cancelText: 'Review',
    type: 'warning',
    isLoading: false,
  },
};

export const Success: Story = {
  render: (args) => <InteractiveConfirmDialog {...args} />,
  args: {
    isOpen: false,
    title: 'Success',
    message: 'Your changes have been saved successfully.',
    confirmText: 'Continue',
    cancelText: 'Close',
    type: 'success',
    isLoading: false,
  },
};

export const Loading: Story = {
  render: (args) => <InteractiveConfirmDialog {...args} />,
  args: {
    isOpen: false,
    title: 'Processing',
    message: 'Please wait while we process your request...',
    confirmText: 'Processing...',
    cancelText: 'Cancel',
    type: 'info',
    isLoading: true,
  },
};

export const LongMessage: Story = {
  render: (args) => <InteractiveConfirmDialog {...args} />,
  args: {
    isOpen: false,
    title: 'Important Notice',
    message: 'This is a longer message that provides more detailed information about the action being confirmed. It includes multiple sentences and explains the implications of proceeding with this action. Please read carefully before making your decision.',
    confirmText: 'I Understand',
    cancelText: 'Go Back',
    type: 'warning',
    isLoading: false,
  },
};

export const CustomButtons: Story = {
  render: (args) => <InteractiveConfirmDialog {...args} />,
  args: {
    isOpen: false,
    title: 'Custom Action',
    message: 'Would you like to save your changes before continuing?',
    confirmText: 'Save & Continue',
    cancelText: 'Continue Without Saving',
    type: 'info',
    isLoading: false,
  },
};