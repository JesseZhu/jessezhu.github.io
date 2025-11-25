# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This is a Jekyll static site built with Ruby. To set up the development environment:

```bash
# Install Ruby gems (if not already installed)
gem install bundler

# Install project dependencies
bundle install

# Start local development server with live reload
bundle exec jekyll serve --watch

# Alternative: serve on specific port
bundle exec jekyll serve --watch --port 4000
```

The site will be available at `http://localhost:4000/`

## Site Architecture

This is a personal blog website using the **Jekyll-Uno** theme, a minimal and responsive Jekyll theme. The site structure follows standard Jekyll conventions:

### Core Directories
- `_posts/` - Blog posts in Markdown format (both .md and .markdown extensions)
- `_layouts/` - HTML templates for different page types (default, post, page, tags, categories)
- `_includes/` - Reusable HTML components (head, header, footer, pagination, disqus)
- `css/` - Stylesheets (main.css imports uno.css and monokai.css)
- `assets/` - Static assets (fonts, images)
- `images/` - Site images including profile.jpg and cover.jpg

### Content Structure
- **Posts**: Located in `_posts/` with Jekyll filename convention `YYYY-MM-DD-title.md`
- **Main page**: `index.html` uses pagination to display recent posts
- **Special pages**: `tags.md` and `categories.md` for content organization
- **RSS feed**: `feed.xml` for blog subscriptions

### Configuration
- `_config.yml` - Main Jekyll configuration with site metadata, author info, and build settings
- `Gemfile` - Ruby dependencies including `github-pages` and `pygments.rb`
- Uses `kramdown` Markdown processor with GitHub Flavored Markdown (GFM)
- Syntax highlighting via `rouge` with Monokai theme

### Content Features
- Blog posts support tags and categorization
- Pagination enabled (10 posts per page)
- Social media integration (Twitter, Facebook, LinkedIn, GitHub)
- Disqus comments (configurable per post)
- RSS/Atom feed support
- Responsive design with mobile navigation

### Customization Notes
- Site is configured for Jesse Zhu, an iOS developer
- Supports both English and Chinese content
- Custom CSS modifications in `main.css` for improved readability
- Font imports include Source Code Pro and LXGW WenKai TC for better typography

### Build Output
- Generated site built to `_site/` directory
- Excludes development files from build (README.md, Gemfile, screenshot.png)