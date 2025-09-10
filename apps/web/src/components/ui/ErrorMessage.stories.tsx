import type { Meta, StoryObj } from '@storybook/react';
import { ErrorMessage } from './ErrorMessage';

const meta: Meta<typeof ErrorMessage> = {
  title: 'UI/ErrorMessage',
  component: ErrorMessage,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible error message component with different types, actions, and styling variants.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: { type: 'text' },
      description: 'Optional title for the error message',
    },
    message: {
      control: { type: 'text' },
      description: 'Main error message content',
    },
    type: {
      control: { type: 'select' },
      options: ['error', 'warning', 'info'],
      description: 'Type of message affecting icon and colors',
    },
    actions: {
      control: { type: 'object' },
      description: 'Array of action buttons',
    },
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ErrorMessage>;

export const Default: Story = {
  args: {
    message: 'An unexpected error occurred. Please try again.',
  },
};

export const WithTitle: Story = {
  args: {
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection.',
  },
};

export const Error: Story = {
  args: {
    title: 'Error',
    message: 'Failed to save your changes. Please try again.',
    type: 'error',
  },
};

export const Warning: Story = {
  args: {
    title: 'Warning',
    message: 'Your session will expire in 5 minutes. Please save your work.',
    type: 'warning',
  },
};

export const Info: Story = {
  args: {
    title: 'Information',
    message: 'Your profile has been updated successfully.',
    type: 'info',
  },
};

export const WithActions: Story = {
  args: {
    title: 'Save Failed',
    message: 'Unable to save your changes due to a network error.',
    type: 'error',
    actions: [
      {
        label: 'Retry',
        onClick: () => console.log('Retry clicked'),
        variant: 'primary',
      },
      {
        label: 'Cancel',
        onClick: () => console.log('Cancel clicked'),
        variant: 'secondary',
      },
    ],
  },
};

export const SingleAction: Story = {
  args: {
    title: 'Update Available',
    message: 'A new version is available. Update now to get the latest features.',
    type: 'info',
    actions: [
      {
        label: 'Update Now',
        onClick: () => console.log('Update clicked'),
        variant: 'primary',
      },
    ],
  },
};

export const LongMessage: Story = {
  args: {
    title: 'Validation Error',
    message: 'The form contains several validation errors. Please review and correct the following fields: email address format is invalid, password must be at least 8 characters long, and phone number format is incorrect. Once corrected, you can resubmit the form.',
    type: 'warning',
  },
};

export const CustomStyling: Story = {
  args: {
    title: 'Custom Styled Error',
    message: 'This error message has custom styling applied.',
    type: 'error',
    className: 'max-w-lg mx-auto',
  },
};