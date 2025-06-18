import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  FaTree, 
  FaCamera, 
  FaCoins, 
  FaChartLine,
  FaArrowRight,
  FaArrowLeft,
  FaTimes
} from 'react-icons/fa';
import { animationVariants, transitions } from '../../utils/animations';
import './Onboarding.css';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string;
  color: string;
}

interface OnboardingProps {
  onComplete: () => void;
  userType: 'family' | 'planter';
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, userType }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const familySteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: t('onboarding.family.welcome.title'),
      description: t('onboarding.family.welcome.description'),
      icon: <FaTree size={48} />,
      image: '/images/onboarding/welcome.svg',
      color: '#00217D',
    },
    {
      id: 'tokens',
      title: t('onboarding.family.tokens.title'),
      description: t('onboarding.family.tokens.description'),
      icon: <FaCoins size={48} />,
      image: '/images/onboarding/tokens.svg',
      color: '#D41125',
    },
    {
      id: 'heritage',
      title: t('onboarding.family.heritage.title'),
      description: t('onboarding.family.heritage.description'),
      icon: <FaCamera size={48} />,
      image: '/images/onboarding/heritage.svg',
      color: '#00217D',
    },
    {
      id: 'impact',
      title: t('onboarding.family.impact.title'),
      description: t('onboarding.family.impact.description'),
      icon: <FaChartLine size={48} />,
      image: '/images/onboarding/impact.svg',
      color: '#D41125',
    },
  ];

  const planterSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: t('onboarding.planter.welcome.title'),
      description: t('onboarding.planter.welcome.description'),
      icon: <FaTree size={48} />,
      image: '/images/onboarding/planter-welcome.svg',
      color: '#00217D',
    },
    {
      id: 'plant',
      title: t('onboarding.planter.plant.title'),
      description: t('onboarding.planter.plant.description'),
      icon: <FaCamera size={48} />,
      image: '/images/onboarding/plant.svg',
      color: '#D41125',
    },
    {
      id: 'verify',
      title: t('onboarding.planter.verify.title'),
      description: t('onboarding.planter.verify.description'),
      icon: <FaChartLine size={48} />,
      image: '/images/onboarding/verify.svg',
      color: '#00217D',
    },
    {
      id: 'earn',
      title: t('onboarding.planter.earn.title'),
      description: t('onboarding.planter.earn.description'),
      icon: <FaCoins size={48} />,
      image: '/images/onboarding/earn.svg',
      color: '#D41125',
    },
  ];

  const steps = userType === 'family' ? familySteps : planterSteps;

  useEffect(() => {
    setProgress(((currentStep + 1) / steps.length) * 100);
  }, [currentStep, steps.length]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    localStorage.setItem('onboardingUserType', userType);
    onComplete();
  };

  const currentStepData = steps[currentStep];

  return (
    <motion.div 
      className="onboarding-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="onboarding-container">
        {/* Progress Bar */}
        <div className="onboarding-progress">
          <motion.div 
            className="onboarding-progress-bar"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            style={{ backgroundColor: currentStepData.color }}
          />
        </div>

        {/* Skip Button */}
        <button 
          className="onboarding-skip"
          onClick={handleSkip}
          aria-label={t('onboarding.skip')}
        >
          <FaTimes />
        </button>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            className="onboarding-content"
            variants={animationVariants.fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitions.normal}
          >
            {/* Step Indicator */}
            <div className="onboarding-steps">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  className={`step-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setCurrentStep(index)}
                  style={{
                    backgroundColor: index <= currentStep ? currentStepData.color : '#E0E0E0',
                  }}
                />
              ))}
            </div>

            {/* Icon */}
            <motion.div 
              className="onboarding-icon"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              style={{ color: currentStepData.color }}
            >
              {currentStepData.icon}
            </motion.div>

            {/* Title */}
            <motion.h2 
              className="onboarding-title"
              variants={animationVariants.fadeInUp}
            >
              {currentStepData.title}
            </motion.h2>

            {/* Description */}
            <motion.p 
              className="onboarding-description"
              variants={animationVariants.fadeInUp}
              transition={{ delay: 0.1 }}
            >
              {currentStepData.description}
            </motion.p>

            {/* Image */}
            <motion.img
              src={currentStepData.image}
              alt={currentStepData.title}
              className="onboarding-image"
              variants={animationVariants.scaleIn}
              transition={{ delay: 0.2 }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="onboarding-navigation">
          <motion.button
            className="onboarding-nav-button"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ opacity: currentStep === 0 ? 0.5 : 1 }}
          >
            <FaArrowLeft /> {t('onboarding.previous')}
          </motion.button>

          <motion.button
            className="onboarding-nav-button primary"
            onClick={handleNext}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ backgroundColor: currentStepData.color }}
          >
            {currentStep === steps.length - 1 
              ? t('onboarding.getStarted') 
              : t('onboarding.next')} <FaArrowRight />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// Hook to check if onboarding should be shown
export const useOnboarding = () => {
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const [userType, setUserType] = useState<'family' | 'planter'>('family');

  useEffect(() => {
    const completed = localStorage.getItem('onboardingCompleted');
    const storedUserType = localStorage.getItem('userType') as 'family' | 'planter';
    
    if (!completed && storedUserType) {
      setShouldShowOnboarding(true);
      setUserType(storedUserType);
    }
  }, []);

  const completeOnboarding = () => {
    setShouldShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem('onboardingCompleted');
    setShouldShowOnboarding(true);
  };

  return {
    shouldShowOnboarding,
    userType,
    completeOnboarding,
    resetOnboarding,
  };
};