import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  FaQuestionCircle, 
  FaTimes, 
  FaSearch,
  FaBook,
  FaVideo,
  FaComments,
  FaLightbulb,
  FaArrowRight
} from 'react-icons/fa';
import { animationVariants } from '../../utils/animations';
import './HelpSystem.css';

interface HelpTopic {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  relatedTopics?: string[];
}

interface HelpContextProps {
  pageContext?: string;
  elementId?: string;
  position?: { x: number; y: number };
}

export const HelpSystem: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const [tooltipContext, setTooltipContext] = useState<HelpContextProps | null>(null);

  const helpTopics: HelpTopic[] = [
    {
      id: 'getting-started',
      title: t('help.topics.gettingStarted.title'),
      content: t('help.topics.gettingStarted.content'),
      category: 'basics',
      keywords: ['start', 'begin', 'new', 'first'],
    },
    {
      id: 'buying-tokens',
      title: t('help.topics.buyingTokens.title'),
      content: t('help.topics.buyingTokens.content'),
      category: 'tokens',
      keywords: ['buy', 'purchase', 'token', 'payment'],
    },
    {
      id: 'uploading-heritage',
      title: t('help.topics.uploadingHeritage.title'),
      content: t('help.topics.uploadingHeritage.content'),
      category: 'heritage',
      keywords: ['upload', 'photo', 'video', 'memory'],
    },
    {
      id: 'tracking-impact',
      title: t('help.topics.trackingImpact.title'),
      content: t('help.topics.trackingImpact.content'),
      category: 'impact',
      keywords: ['impact', 'trees', 'dashboard', 'track'],
    },
    {
      id: 'planting-trees',
      title: t('help.topics.plantingTrees.title'),
      content: t('help.topics.plantingTrees.content'),
      category: 'planting',
      keywords: ['plant', 'tree', 'gps', 'photo'],
    },
    {
      id: 'verification-process',
      title: t('help.topics.verification.title'),
      content: t('help.topics.verification.content'),
      category: 'planting',
      keywords: ['verify', 'verification', 'approve'],
    },
  ];

  const categories = [
    { id: 'all', label: t('help.categories.all'), icon: <FaBook /> },
    { id: 'basics', label: t('help.categories.basics'), icon: <FaLightbulb /> },
    { id: 'tokens', label: t('help.categories.tokens'), icon: <FaQuestionCircle /> },
    { id: 'heritage', label: t('help.categories.heritage'), icon: <FaBook /> },
    { id: 'impact', label: t('help.categories.impact'), icon: <FaComments /> },
    { id: 'planting', label: t('help.categories.planting'), icon: <FaVideo /> },
  ];

  // Filter topics based on search and category
  const filteredTopics = helpTopics.filter(topic => {
    const matchesSearch = searchQuery === '' || 
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.keywords.some(keyword => keyword.includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || topic.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Global help button
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '?' && (e.ctrlKey || e.metaKey)) {
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Context-aware help tooltips
  useEffect(() => {
    const handleHelpHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const helpId = target.getAttribute('data-help');
      
      if (helpId) {
        const rect = target.getBoundingClientRect();
        setTooltipContext({
          elementId: helpId,
          position: {
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
          },
        });
      }
    };

    const handleHelpLeave = () => {
      setTooltipContext(null);
    };

    document.addEventListener('mouseover', handleHelpHover);
    document.addEventListener('mouseleave', handleHelpLeave);

    return () => {
      document.removeEventListener('mouseover', handleHelpHover);
      document.removeEventListener('mouseleave', handleHelpLeave);
    };
  }, []);

  return (
    <>
      {/* Floating Help Button */}
      <motion.button
        className="help-button-floating"
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <FaQuestionCircle size={24} />
      </motion.button>

      {/* Help Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="help-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className="help-modal"
              variants={animationVariants.scaleIn}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="help-header">
                <h2>{t('help.title')}</h2>
                <button 
                  className="help-close"
                  onClick={() => setIsOpen(false)}
                >
                  <FaTimes />
                </button>
              </div>

              {/* Search */}
              <div className="help-search">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder={t('help.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="help-search-input"
                />
              </div>

              {/* Categories */}
              <div className="help-categories">
                {categories.map(category => (
                  <motion.button
                    key={category.id}
                    className={`help-category ${selectedCategory === category.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {category.icon}
                    {category.label}
                  </motion.button>
                ))}
              </div>

              {/* Content */}
              <div className="help-content">
                <AnimatePresence mode="wait">
                  {selectedTopic ? (
                    <motion.div
                      key="topic"
                      className="help-topic-detail"
                      variants={animationVariants.fadeIn}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <button 
                        className="help-back"
                        onClick={() => setSelectedTopic(null)}
                      >
                        ← {t('help.back')}
                      </button>
                      <h3>{selectedTopic.title}</h3>
                      <p>{selectedTopic.content}</p>
                      
                      {selectedTopic.relatedTopics && (
                        <div className="help-related">
                          <h4>{t('help.relatedTopics')}</h4>
                          {selectedTopic.relatedTopics.map(topicId => {
                            const topic = helpTopics.find(t => t.id === topicId);
                            return topic ? (
                              <button
                                key={topicId}
                                className="help-related-link"
                                onClick={() => setSelectedTopic(topic)}
                              >
                                {topic.title} <FaArrowRight />
                              </button>
                            ) : null;
                          })}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      className="help-topics-list"
                      variants={animationVariants.fadeIn}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {filteredTopics.length > 0 ? (
                        filteredTopics.map(topic => (
                          <motion.div
                            key={topic.id}
                            className="help-topic-item"
                            onClick={() => setSelectedTopic(topic)}
                            whileHover={{ x: 5 }}
                          >
                            <h4>{topic.title}</h4>
                            <p>{topic.content.substring(0, 100)}...</p>
                          </motion.div>
                        ))
                      ) : (
                        <div className="help-no-results">
                          <p>{t('help.noResults')}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="help-footer">
                <a href="/faq" className="help-link">
                  {t('help.viewFAQ')}
                </a>
                <a href="/contact" className="help-link">
                  {t('help.contactSupport')}
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Tooltip */}
      <AnimatePresence>
        {tooltipContext && (
          <motion.div
            className="help-tooltip"
            style={{
              left: tooltipContext.position.x,
              top: tooltipContext.position.y,
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className="help-tooltip-content">
              {t(`help.tooltips.${tooltipContext.elementId}`)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Help Provider Component
export const HelpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <HelpSystem />
    </>
  );
};

// Help Icon Component for inline help
interface HelpIconProps {
  helpId: string;
  size?: number;
}

export const HelpIcon: React.FC<HelpIconProps> = ({ helpId, size = 16 }) => {
  return (
    <span 
      className="help-icon-inline"
      data-help={helpId}
    >
      <FaQuestionCircle size={size} />
    </span>
  );
};