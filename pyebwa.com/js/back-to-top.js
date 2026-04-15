// Back to Top Button Functionality
(function() {
    function initBackToTop() {
        if (document.getElementById('backToTop')) {
            return;
        }

    // Create back to top button
    const backToTopBtn = document.createElement('button');
    backToTopBtn.id = 'backToTop';
    backToTopBtn.className = 'back-to-top';
    backToTopBtn.innerHTML = '<span class="material-icons">arrow_upward</span>';
    backToTopBtn.setAttribute('aria-label', 'Back to top');
    backToTopBtn.style.display = 'none';
    
    // Add to body
    document.body.appendChild(backToTopBtn);
    
    // Add styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        .back-to-top {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, rgba(81, 50, 25, 0.94) 0%, rgba(113, 74, 41, 0.88) 100%);
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        .back-to-top:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
            background: linear-gradient(135deg, rgba(113, 74, 41, 0.94) 0%, rgba(81, 50, 25, 0.9) 100%);
        }
        
        .back-to-top:active {
            transform: translateY(-1px);
        }
        
        .back-to-top .material-icons {
            color: #B7B2A7;
            font-size: 24px;
        }
        
        .back-to-top.visible {
            display: flex;
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: scale(0.5);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
        
        /* Dark mode support */
        body.dark-mode .back-to-top {
            background: linear-gradient(135deg, rgba(41, 24, 17, 0.94) 0%, rgba(107, 75, 47, 0.9) 100%);
        }
        
        body.dark-mode .back-to-top:hover {
            background: linear-gradient(135deg, rgba(144, 100, 49, 0.94) 0%, rgba(41, 24, 17, 0.92) 100%);
        }
        
        /* Mobile adjustments */
        @media (max-width: 768px) {
            .back-to-top {
                bottom: 20px;
                right: 20px;
                width: 45px;
                height: 45px;
            }
            
            .back-to-top .material-icons {
                font-size: 22px;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Show/hide button based on scroll position
    let isScrolling = false;
    window.addEventListener('scroll', function() {
        if (!isScrolling) {
            window.requestAnimationFrame(function() {
                if (window.pageYOffset > 300) {
                    backToTopBtn.style.display = 'flex';
                    setTimeout(() => {
                        backToTopBtn.classList.add('visible');
                    }, 10);
                } else {
                    backToTopBtn.classList.remove('visible');
                    setTimeout(() => {
                        if (!backToTopBtn.classList.contains('visible')) {
                            backToTopBtn.style.display = 'none';
                        }
                    }, 300);
                }
                isScrolling = false;
            });
            isScrolling = true;
        }
    });
    
    // Smooth scroll to top when clicked
    backToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Keyboard support
    backToTopBtn.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackToTop, { once: true });
    } else {
        initBackToTop();
    }
})();
