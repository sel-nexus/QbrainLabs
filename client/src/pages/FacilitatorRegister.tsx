import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { UserPlus, Mail, Lock, User, Building2, Eye, EyeOff, CheckCircle } from 'lucide-react';

export function FacilitatorRegister() {
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    organization: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.full_name || formData.full_name.length < 2) {
      newErrors.full_name = 'Name must be at least 2 characters';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      } else if (!/[A-Z]/.test(formData.password)) {
        newErrors.password = 'Password must contain an uppercase letter';
      } else if (!/[a-z]/.test(formData.password)) {
        newErrors.password = 'Password must contain a lowercase letter';
      } else if (!/\d/.test(formData.password)) {
        newErrors.password = 'Password must contain a number';
      }
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        organization: formData.organization || undefined,
      });

      setRegistrationComplete(true);
      toast.success('Registration submitted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (registrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center theme-bg-secondary px-4">
        <div className="max-w-md w-full rounded-2xl shadow-lg p-8 text-center theme-card border">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full theme-icon-success flex items-center justify-center">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold theme-text-primary mb-4">
            Registration Submitted
          </h2>
          <p className="theme-text-secondary mb-6">
            Your facilitator account request has been submitted successfully. 
            An administrator will review your request and activate your account.
          </p>
          <p className="text-sm contrast-muted mb-8">
            You will receive an email notification once your account is approved.
          </p>
          <Link
            to="/facilitator-login"
            className="inline-block px-6 py-3 bg-brand-violet text-white rounded-lg hover:bg-brand-violet/90 transition-colors"
          >
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center theme-bg-secondary px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-violet/10 flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-brand-violet" />
          </div>
          <h1 className="text-3xl font-bold theme-text-primary">
            Facilitator Registration
          </h1>
          <p className="theme-text-secondary mt-2">
            Create an account to facilitate workshops
          </p>
        </div>

        <div className="rounded-2xl shadow-lg p-8 theme-card border">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 contrast-muted" />
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-brand-violet focus:border-transparent theme-input ${
                    errors.full_name ? 'border-[var(--theme-danger-text)]' : ''
                  }`}
                  placeholder="John Smith"
                />
              </div>
              {errors.full_name && (
                <p className="mt-1 text-sm" style={{ color: 'var(--theme-danger-text)' }}>{errors.full_name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 contrast-muted" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-brand-violet focus:border-transparent theme-input ${
                    errors.email ? 'border-[var(--theme-danger-text)]' : ''
                  }`}
                  placeholder="john@company.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm" style={{ color: 'var(--theme-danger-text)' }}>{errors.email}</p>
              )}
            </div>

            {/* Organization */}
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-1">
                Organization <span className="contrast-muted">(Optional)</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 contrast-muted" />
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-brand-violet focus:border-transparent theme-input"
                  placeholder="Your Company"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 contrast-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full pl-10 pr-12 py-3 rounded-lg focus:ring-2 focus:ring-brand-violet focus:border-transparent theme-input ${
                    errors.password ? 'border-[var(--theme-danger-text)]' : ''
                  }`}
                  placeholder="Min 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 contrast-muted hover:theme-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm" style={{ color: 'var(--theme-danger-text)' }}>{errors.password}</p>
              )}
              <p className="mt-1 text-xs contrast-muted">
                Must contain uppercase, lowercase, and a number
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 contrast-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-brand-violet focus:border-transparent theme-input ${
                    errors.confirmPassword ? 'border-[var(--theme-danger-text)]' : ''
                  }`}
                  placeholder="Confirm your password"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm" style={{ color: 'var(--theme-danger-text)' }}>{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-brand-violet text-white rounded-lg hover:bg-brand-violet/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Registering...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Register as Facilitator
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm theme-text-secondary">
              Already have an account?{' '}
              <Link
                to="/facilitator-login"
                className="text-brand-violet hover:text-brand-violet/80 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-4 p-4 rounded-lg theme-badge-info">
            <p className="text-xs">
              <strong>Note:</strong> After registration, your account will require administrator 
              approval before you can access the system. You'll receive an email once approved.
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link to="/" className="contrast-muted hover:theme-text-primary text-sm transition">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
