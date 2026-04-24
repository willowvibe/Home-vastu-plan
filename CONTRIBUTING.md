# Contributing to VastuPlan 2D

Thank you for your interest in contributing to VastuPlan 2D!

## Code of Conduct

Please be respectful and constructive in all interactions.

## How Can I Contribute?

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. Use clear description of the issue
3. Include steps to reproduce and expected behavior

### Suggesting Features

1. Check if the feature has already been suggested
2. Explain the use case and benefits

### Pull Requests

1. Fork the repository
2. Create a branch for your feature/fix
3. Make your changes
4. Test thoroughly
5. Submit a pull request with clear description

## Development Setup

1. Clone the repository

```bash
git clone https://github.com/harishconti/Home-vastu-plan.git
cd Home-vastu-plan
```

2. Install dependencies

```bash
npm install
```

3. Start the development server

```bash
npm run dev
```

4. Build for production

```bash
npm run build
```

### Collaboration Server (Optional)

To run the real-time collaboration backend:

```bash
cd server
npm install
npm run dev
```

The server runs on port 3001 by default. Set `VITE_COLLAB_SERVER_URL` in your `.env` file to point to the server.

## Coding Standards

- Use TypeScript for all code
- Follow existing code style
- Add comments for complex logic
- Update documentation for new features

## Branching Strategy

- main - Production-ready code
- feature-\* - New features
- fix-\* - Bug fixes
- docs-\* - Documentation updates

## Pull Request Process

1. Update documentation as needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Get approval from maintainers
