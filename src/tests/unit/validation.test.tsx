/**
 * Unit tests for validation edge cases
 * Tests empty required fields, invalid formats, and boundary conditions
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthForm } from '../../components/AuthForm';
import { ConfigForm } from '../../components/ConfigForm';
import { InterviewConfig } from '../../types';

describe('AuthForm Validation Edge Cases', () => {
  const mockOnLogin = vi.fn();
  const mockOnRegister = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty Required Fields', () => {
    it('should show error when email is empty', async () => {
      render(
        <AuthForm
          onLogin={mockOnLogin}
          onRegister={mockOnRegister}
          loading={false}
          onSuccess={mockOnSuccess}
        />
      );

      // Clear the default email value
      const emailInput = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(emailInput, { target: { value: '' } });

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required.')).toBeInTheDocument();
      });

      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    it('should show error when password is empty', async () => {
      render(
        <AuthForm
          onLogin={mockOnLogin}
          onRegister={mockOnRegister}
          loading={false}
          onSuccess={mockOnSuccess}
        />
      );
      const emailInput = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      // Clear the default password value
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      fireEvent.change(passwordInput, { target: { value: '' } });

      const submitButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password is required.')).toBeInTheDocument();
      });

      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    it('should show error when name is empty during registration', async () => {
      render(
        <AuthForm
          onLogin={mockOnLogin}
          onRegister={mockOnRegister}
          loading={false}
          onSuccess={mockOnSuccess}
        />
      );

      // Switch to registration mode
      const signUpButton = screen.getByText('Sign up');
      fireEvent.click(signUpButton);

      // Clear the default name value
      const nameInput = screen.getByPlaceholderText('Enter your full name');
      fireEvent.change(nameInput, { target: { value: '' } });

      const emailInput = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Full name is required for registration.')).toBeInTheDocument();
      });

      expect(mockOnRegister).not.toHaveBeenCalled();
    });
  });

  describe('Invalid Email Formats', () => {
    it('should show error for email without @ symbol', async () => {
      render(
        <AuthForm
          onLogin={mockOnLogin}
          onRegister={mockOnRegister}
          loading={false}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(emailInput, { target: { value: 'invalidemail.com' } });

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
      }, { timeout: 2000 });

      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    it('should show error for email without domain', async () => {
      render(
        <AuthForm
          onLogin={mockOnLogin}
          onRegister={mockOnRegister}
          loading={false}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(emailInput, { target: { value: 'test@' } });

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
      }, { timeout: 2000 });

      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    it('should show error for email without dot in domain', async () => {
      render(
        <AuthForm
          onLogin={mockOnLogin}
          onRegister={mockOnRegister}
          loading={false}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(emailInput, { target: { value: 'test@domain' } });

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
      });

      expect(mockOnLogin).not.toHaveBeenCalled();
    });
  });

  describe('Short Passwords', () => {
    it('should show error for password with 5 characters', async () => {
      render(
        <AuthForm
          onLogin={mockOnLogin}
          onRegister={mockOnRegister}
          loading={false}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      fireEvent.change(passwordInput, { target: { value: '12345' } });

      const submitButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 6 characters long.')).toBeInTheDocument();
      });

      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    it('should show error for password with 1 character', async () => {
      render(
        <AuthForm
          onLogin={mockOnLogin}
          onRegister={mockOnRegister}
          loading={false}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      fireEvent.change(passwordInput, { target: { value: '1' } });

      const submitButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 6 characters long.')).toBeInTheDocument();
      });

      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    it('should accept password with exactly 6 characters', async () => {
      mockOnLogin.mockResolvedValue({ success: true });

      render(
        <AuthForm
          onLogin={mockOnLogin}
          onRegister={mockOnRegister}
          loading={false}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      fireEvent.change(passwordInput, { target: { value: '123456' } });

      const submitButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith('test@example.com', '123456');
      });
    });
  });
});

describe('ConfigForm Validation Edge Cases', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty Required Fields', () => {
    it('should show error when role is empty', async () => {
      render(
        <ConfigForm
          mode="learn"
          onSubmit={mockOnSubmit}
          loading={false}
        />
      );

      // Clear the default role value
      const roleInput = screen.getByPlaceholderText('e.g., Senior Software Engineer');
      fireEvent.change(roleInput, { target: { value: '' } });

      const submitButton = screen.getByRole('button', { name: /start learn session/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('• Enter a target role')).toBeInTheDocument();
      }, { timeout: 2000 });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error when company is empty', async () => {
      render(
        <ConfigForm
          mode="learn"
          onSubmit={mockOnSubmit}
          loading={false}
        />
      );

      // Clear the default company value
      const companyInput = screen.getByPlaceholderText('e.g., Google, Microsoft, Amazon');
      fireEvent.change(companyInput, { target: { value: '' } });

      const submitButton = screen.getByRole('button', { name: /start learn session/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('• Enter a target company')).toBeInTheDocument();
      }, { timeout: 2000 });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Empty Skill Arrays', () => {
    it('should show error when no skills are added', async () => {
      render(
        <ConfigForm
          mode="learn"
          onSubmit={mockOnSubmit}
          loading={false}
        />
      );

      // Remove all default skills by clicking the X buttons in skill tags
      const skillTags = screen.getAllByText(/React|JavaScript|Node\.js/);
      // Find the parent elements and then the remove buttons
      for (const skillTag of skillTags) {
        const skillContainer = skillTag.closest('span');
        if (skillContainer) {
          const removeButton = skillContainer.querySelector('button');
          if (removeButton) {
            fireEvent.click(removeButton);
          }
        }
      }

      const submitButton = screen.getByRole('button', { name: /start learn session/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Add at least one skill to continue')).toBeInTheDocument();
        expect(screen.getByText('• Add at least one skill')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should accept form when at least one skill is present', async () => {
      render(
        <ConfigForm
          mode="learn"
          onSubmit={mockOnSubmit}
          loading={false}
        />
      );

      // Keep default skills and submit
      const submitButton = screen.getByRole('button', { name: /start learn session/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      const submittedConfig = mockOnSubmit.mock.calls[0][0] as InterviewConfig;
      expect(submittedConfig.skills.length).toBeGreaterThan(0);
    });
  });

  describe('Empty Question Type Arrays', () => {
    it('should show error when no question types are selected', async () => {
      render(
        <ConfigForm
          mode="learn"
          onSubmit={mockOnSubmit}
          loading={false}
        />
      );

      // Deselect all default question types
      const technicalCodingOption = screen.getByText('Technical Coding').closest('div');
      const technicalConceptsOption = screen.getByText('Technical Concepts').closest('div');
      
      if (technicalCodingOption) fireEvent.click(technicalCodingOption);
      if (technicalConceptsOption) fireEvent.click(technicalConceptsOption);

      const submitButton = screen.getByRole('button', { name: /start learn session/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please select at least one question type')).toBeInTheDocument();
        expect(screen.getByText('• Select at least one question type')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should accept form when at least one question type is selected', async () => {
      render(
        <ConfigForm
          mode="learn"
          onSubmit={mockOnSubmit}
          loading={false}
        />
      );

      // Keep default question types and submit
      const submitButton = screen.getByRole('button', { name: /start learn session/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      const submittedConfig = mockOnSubmit.mock.calls[0][0] as InterviewConfig;
      expect(submittedConfig.questionTypes.length).toBeGreaterThan(0);
    });
  });

  describe('Combined Validation Errors', () => {
    it('should show all validation errors when multiple fields are invalid', async () => {
      render(
        <ConfigForm
          mode="learn"
          onSubmit={mockOnSubmit}
          loading={false}
        />
      );

      // Clear role
      const roleInput = screen.getByPlaceholderText('e.g., Senior Software Engineer');
      fireEvent.change(roleInput, { target: { value: '' } });

      // Clear company
      const companyInput = screen.getByPlaceholderText('e.g., Google, Microsoft, Amazon');
      fireEvent.change(companyInput, { target: { value: '' } });

      // Remove all skills by clicking the X buttons in skill tags
      const skillTags = screen.getAllByText(/React|JavaScript|Node\.js/);
      // Find the parent elements and then the remove buttons
      for (const skillTag of skillTags) {
        const skillContainer = skillTag.closest('span');
        if (skillContainer) {
          const removeButton = skillContainer.querySelector('button');
          if (removeButton) {
            fireEvent.click(removeButton);
          }
        }
      }

      // Deselect all question types
      const technicalCodingOption = screen.getByText('Technical Coding').closest('div');
      const technicalConceptsOption = screen.getByText('Technical Concepts').closest('div');
      
      if (technicalCodingOption) fireEvent.click(technicalCodingOption);
      if (technicalConceptsOption) fireEvent.click(technicalConceptsOption);

      const submitButton = screen.getByRole('button', { name: /start learn session/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('• Enter a target role')).toBeInTheDocument();
        expect(screen.getByText('• Enter a target company')).toBeInTheDocument();
        expect(screen.getByText('• Add at least one skill')).toBeInTheDocument();
        expect(screen.getByText('• Select at least one question type')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });
});