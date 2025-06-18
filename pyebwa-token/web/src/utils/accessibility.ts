// Accessibility utilities for PYEBWA Token

// Keyboard navigation hooks
import { useEffect, useRef } from 'react';

/**
 * Focus trap hook for modals and overlays
 */
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element
    firstElement?.focus();

    // Add event listener
    container.addEventListener('keydown', handleTabKey);

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);

  return containerRef;
};

/**
 * Keyboard shortcuts hook
 */
interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      shortcuts.forEach(shortcut => {
        const matchesKey = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const matchesShift = shortcut.shift ? e.shiftKey : true;
        const matchesAlt = shortcut.alt ? e.altKey : true;

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
          e.preventDefault();
          shortcut.handler();
        }
      });
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [shortcuts]);
};

/**
 * Screen reader announcements
 */
export const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  
  announcement.textContent = message;
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Skip links component
 */
export const SkipLinks = () => {
  return (
    <div className="skip-links">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#navigation" className="skip-link">
        Skip to navigation
      </a>
      <a href="#footer" className="skip-link">
        Skip to footer
      </a>
    </div>
  );
};

/**
 * Reduced motion preference
 */
export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * High contrast mode detection
 */
export const prefersHighContrast = () => {
  return window.matchMedia('(prefers-contrast: high)').matches;
};

/**
 * Focus visible styles
 */
export const focusStyles = `
  :focus-visible {
    outline: 3px solid #00217D;
    outline-offset: 2px;
  }

  .focus-visible-only:focus:not(:focus-visible) {
    outline: none;
  }
`;

/**
 * ARIA labels for dynamic content
 */
export const ariaLabels = {
  loading: 'Loading, please wait',
  success: 'Operation completed successfully',
  error: 'An error occurred',
  required: 'Required field',
  optional: 'Optional field',
  expanded: 'Expanded',
  collapsed: 'Collapsed',
  selected: 'Selected',
  notSelected: 'Not selected',
};

/**
 * Color contrast utilities
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  const getLuminance = (color: string): number => {
    const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
    const [r, g, b] = rgb.map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * Accessible color palette
 */
export const accessibleColors = {
  primary: {
    default: '#00217D',
    hover: '#001654',
    active: '#000D2B',
    text: '#FFFFFF',
  },
  secondary: {
    default: '#D41125',
    hover: '#A60E1E',
    active: '#7D0A16',
    text: '#FFFFFF',
  },
  success: {
    default: '#4CAF50',
    hover: '#388E3C',
    active: '#2E7D32',
    text: '#000000',
  },
  warning: {
    default: '#FF9800',
    hover: '#F57C00',
    active: '#E65100',
    text: '#000000',
  },
  error: {
    default: '#F44336',
    hover: '#D32F2F',
    active: '#B71C1C',
    text: '#FFFFFF',
  },
  neutral: {
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
};

/**
 * Text size utilities
 */
export const textSizes = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
};

/**
 * Accessible form validation messages
 */
export const getValidationMessage = (
  fieldName: string,
  validationType: 'required' | 'email' | 'min' | 'max' | 'pattern',
  value?: any
): string => {
  const messages = {
    required: `${fieldName} is required`,
    email: `Please enter a valid email address for ${fieldName}`,
    min: `${fieldName} must be at least ${value}`,
    max: `${fieldName} must be no more than ${value}`,
    pattern: `${fieldName} format is invalid`,
  };

  return messages[validationType];
};

/**
 * Accessible loading states
 */
export const LoadingState = ({ message = 'Loading...' }: { message?: string }) => {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{message}</span>
      <div className="loading-spinner" aria-hidden="true" />
    </div>
  );
};

/**
 * Screen reader only text
 */
export const srOnly = `
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

/**
 * Accessible icon component
 */
interface AccessibleIconProps {
  icon: React.ReactNode;
  label: string;
  decorative?: boolean;
}

export const AccessibleIcon: React.FC<AccessibleIconProps> = ({ 
  icon, 
  label, 
  decorative = false 
}) => {
  if (decorative) {
    return <span aria-hidden="true">{icon}</span>;
  }

  return (
    <span role="img" aria-label={label}>
      {icon}
    </span>
  );
};

/**
 * Accessible tooltip hook
 */
export const useTooltip = () => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => setIsVisible(true);
  const hideTooltip = () => setIsVisible(false);

  const tooltipProps = {
    role: 'tooltip',
    'aria-hidden': !isVisible,
    ref: tooltipRef,
  };

  const triggerProps = {
    'aria-describedby': isVisible ? 'tooltip' : undefined,
    onMouseEnter: showTooltip,
    onMouseLeave: hideTooltip,
    onFocus: showTooltip,
    onBlur: hideTooltip,
    ref: triggerRef,
  };

  return { isVisible, tooltipProps, triggerProps };
};