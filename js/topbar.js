document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('topbar-search-input');
  const resultsBox = document.getElementById('topbar-search-results');
  const searchWrapper = document.querySelector('.topbar-search');

  if (!input || !resultsBox || !window.topbarPosts) return;

  const maxResults = 6;

  const renderResults = (items) => {
    if (!items.length) {
      resultsBox.innerHTML = '<div class="topbar-search-empty">未找到匹配内容</div>';
      resultsBox.classList.add('visible');
      return;
    }

    const list = items.map(item => {
      const categories = (item.categories || []).map(cat => `<span class="search-result-tag">${cat}</span>`).join('');
      return `
        <a href="${item.url}" class="search-result-item">
          <div class="search-result-title">${item.title}</div>
          <div class="search-result-meta">
            <span>${item.date}</span>
            <span class="search-result-tags">${categories}</span>
          </div>
        </a>
      `;
    }).join('');

    resultsBox.innerHTML = list;
    resultsBox.classList.add('visible');
  };

  const hideResults = () => {
    resultsBox.innerHTML = '';
    resultsBox.classList.remove('visible');
  };

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (query.length === 0) {
      hideResults();
      return;
    }

    const matched = window.topbarPosts.filter(item => {
      const titleMatch = item.title && item.title.toLowerCase().includes(query);
      const categoryMatch = (item.categories || []).some(cat => (cat || '').toLowerCase().includes(query));
      return titleMatch || categoryMatch;
    }).slice(0, maxResults);

    renderResults(matched);
  });

  input.addEventListener('focus', () => {
    if (input.value.trim()) {
      resultsBox.classList.add('visible');
    }
  });

  document.addEventListener('click', (event) => {
    if (searchWrapper && !searchWrapper.contains(event.target)) {
      hideResults();
    }
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideResults();
      input.blur();
    }
  });
});

