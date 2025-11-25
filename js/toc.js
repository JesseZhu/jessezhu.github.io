document.addEventListener('DOMContentLoaded', function() {
  // Generate IDs for headings that don't have them
  const content = document.querySelector('.post');
  if (!content) return;

  const headings = content.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const headingIdMap = new Map();
  const headingElements = [];

  headings.forEach((heading, index) => {
    let id = heading.getAttribute('id');
    if (!id) {
      const text = heading.textContent.trim();
      id = text.toLowerCase()
        .replace(/[^\w\s\u4e00-\u9fa5-]/g, '') // Keep Chinese characters
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');

      if (!id) {
        id = `heading-${index}`;
      }

      // Handle duplicate IDs
      let uniqueId = id;
      let counter = 1;
      while (headingIdMap.has(uniqueId)) {
        uniqueId = `${id}-${counter}`;
        counter++;
      }

      headingIdMap.set(uniqueId, true);
      heading.setAttribute('id', uniqueId);
    }
    
    // Store heading element with its position
    headingElements.push({
      element: heading,
      id: heading.getAttribute('id'),
      level: parseInt(heading.tagName.charAt(1)),
      top: 0
    });
  });

  // Update TOC links to match generated IDs
  const tocLinks = document.querySelectorAll('.toc-link');
  tocLinks.forEach(link => {
    const targetText = link.textContent.trim();
    const heading = Array.from(headings).find(h => h.textContent.trim() === targetText);
    if (heading && heading.getAttribute('id')) {
      link.setAttribute('href', '#' + heading.getAttribute('id'));
    }
  });

  // Get TOC elements
  const tocWrapper = document.querySelector('.toc-wrapper');
  const tocToggleBtn = document.querySelector('.toc-toggle-btn');
  const tocCloseBtn = document.querySelector('.toc-close-btn');
  const tocOverlay = document.querySelector('.toc-overlay');

  if (!tocWrapper || !tocToggleBtn) return;

  // Toggle sidebar
  function toggleSidebar() {
    tocWrapper.classList.toggle('active');
    // Prevent body scroll when sidebar is open on mobile
    if (window.innerWidth <= 768) {
      if (tocWrapper.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  // Open sidebar
  function openSidebar() {
    tocWrapper.classList.add('active');
    if (window.innerWidth <= 768) {
      document.body.style.overflow = 'hidden';
    }
  }

  // Close sidebar
  function closeSidebar() {
    tocWrapper.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Event listeners
  tocToggleBtn.addEventListener('click', toggleSidebar);
  if (tocCloseBtn) {
    tocCloseBtn.addEventListener('click', closeSidebar);
  }
  if (tocOverlay) {
    tocOverlay.addEventListener('click', closeSidebar);
  }

  // Close on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && tocWrapper.classList.contains('active')) {
      closeSidebar();
    }
  });

  // Smooth scrolling for TOC links
  tocLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();

      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        const offsetTop = targetElement.getBoundingClientRect().top + window.pageYOffset - 100;
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });

        // Update URL
        history.pushState(null, null, `#${targetId}`);

        // Close sidebar on mobile after clicking
        if (window.innerWidth <= 768) {
          setTimeout(closeSidebar, 300);
        }
      }
    });
  });

  // Update heading positions
  function updateHeadingPositions() {
    headingElements.forEach(item => {
      item.top = item.element.getBoundingClientRect().top + window.pageYOffset;
    });
  }

  // Highlight active section on scroll - Notion-like behavior
  function updateActiveTOC() {
    updateHeadingPositions();
    
    const viewportTop = window.pageYOffset;
    const viewportCenter = viewportTop + window.innerHeight / 2;
    const offset = 150; // Offset for header

    let activeSection = null;
    let activeIndex = -1;

    // Find the section that's currently in view or closest to viewport center
    for (let i = headingElements.length - 1; i >= 0; i--) {
      const item = headingElements[i];
      const rect = item.element.getBoundingClientRect();
      
      // Check if section is in viewport with some offset
      if (rect.top <= viewportCenter && rect.bottom >= offset) {
        activeSection = item;
        activeIndex = i;
        break;
      }
    }

    // If no section found, use the first one that's below viewport
    if (!activeSection && headingElements.length > 0) {
      for (let i = 0; i < headingElements.length; i++) {
        const item = headingElements[i];
        if (item.top > viewportTop) {
          activeSection = item;
          activeIndex = i;
          break;
        }
      }
    }

    // If still no section, use the last one
    if (!activeSection && headingElements.length > 0) {
      activeSection = headingElements[headingElements.length - 1];
      activeIndex = headingElements.length - 1;
    }

    // Update TOC links
    tocLinks.forEach(link => {
      link.classList.remove('toc-active');
      if (activeSection && link.getAttribute('href') === `#${activeSection.id}`) {
        link.classList.add('toc-active');
        
        // Scroll active link into view in sidebar
        if (tocWrapper.classList.contains('active')) {
          const linkRect = link.getBoundingClientRect();
          const sidebarNav = document.querySelector('.toc-sidebar-nav');
          if (sidebarNav) {
            const sidebarRect = sidebarNav.getBoundingClientRect();
            if (linkRect.top < sidebarRect.top || linkRect.bottom > sidebarRect.bottom) {
              link.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      }
    });
  }

  // Throttle scroll events
  let ticking = false;
  
  function requestTick() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateActiveTOC();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', () => {
    updateHeadingPositions();
    updateActiveTOC();
  }, { passive: true });

  // Handle initial hash
  if (window.location.hash) {
    const targetElement = document.querySelector(window.location.hash);
    if (targetElement) {
      setTimeout(() => {
        const offsetTop = targetElement.getBoundingClientRect().top + window.pageYOffset - 100;
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
        // Open sidebar if hash is present
        openSidebar();
      }, 500);
    }
  }

  // Initial update
  updateHeadingPositions();
  setTimeout(updateActiveTOC, 100);
  
  // Update positions after images load
  if (document.images.length > 0) {
    let imagesLoaded = 0;
    Array.from(document.images).forEach(img => {
      if (img.complete) {
        imagesLoaded++;
      } else {
        img.addEventListener('load', () => {
          imagesLoaded++;
          if (imagesLoaded === document.images.length) {
            updateHeadingPositions();
            updateActiveTOC();
          }
        }, { once: true });
      }
    });
    if (imagesLoaded === document.images.length) {
      setTimeout(() => {
        updateHeadingPositions();
        updateActiveTOC();
      }, 500);
    }
  }
});
