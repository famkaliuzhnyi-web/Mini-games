# 🤝 Contributing to Mini-games

Thank you for your interest in contributing to the Mini-games project! We welcome contributions of all kinds, from bug reports and feature requests to code contributions and documentation improvements.

## 🚀 Ways to Contribute

### 🐛 Report Bugs
Found a bug? Help us fix it!
- Check [existing issues](https://github.com/famkaliuzhnyi-web/Mini-games/issues) first
- Use the **Bug Report** template when creating a new issue
- Include steps to reproduce, expected behavior, and screenshots if applicable
- Test on multiple devices/browsers when possible

### 💡 Suggest Features
Have an idea for a new game or platform improvement?
- Check [existing issues](https://github.com/famkaliuzhnyi-web/Mini-games/issues) and [discussions](https://github.com/famkaliuzhnyi-web/Mini-games/discussions)
- Use the **Feature Request** template for new issues
- Provide detailed descriptions and use cases
- Include mockups or examples if helpful

### 🎮 Request Games
Want to see a specific game added to the collection?
- Use the **Game Request** template in issues
- Describe the game mechanics and features
- Explain why it would be a good fit for the platform
- Community voting helps prioritize development

### 💻 Code Contributions
Ready to implement features or fix bugs?
- Check out our [Development Guide](DEVELOPMENT.md)
- Look for issues labeled `good first issue` for beginners
- Comment on issues you'd like to work on
- Follow our coding standards and pull request process

### 📖 Improve Documentation
Help make our documentation better!
- Fix typos or unclear explanations
- Add examples or tutorials
- Improve formatting and organization
- Translate documentation (future goal)

## 🏗️ Development Setup

### Prerequisites
- **Node.js** 18+ and npm
- **Git** for version control
- **Modern browser** for testing
- **VS Code** (recommended) with suggested extensions

### Quick Start
```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/Mini-games.git
cd Mini-games

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

### Development Workflow
1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. **Create** a branch: `git checkout -b feature/your-feature-name`
4. **Make** your changes following our guidelines
5. **Test** your changes thoroughly
6. **Commit** with clear messages
7. **Push** to your fork: `git push origin feature/your-feature-name`
8. **Create** a pull request

## 📋 Coding Standards

### TypeScript Guidelines
- Use **strict mode** with proper typing
- Prefer **interfaces** over types for object shapes
- Use **meaningful names** for variables and functions
- Add **JSDoc comments** for public APIs
- Follow **React hooks** best practices

### Code Style
```typescript
// ✅ Good: Clear naming and proper typing
interface GameState {
  readonly status: 'waiting' | 'playing' | 'finished';
  readonly score: number;
  readonly timeRemaining: number;
}

const useGameTimer = (initialTime: number): GameTimerResult => {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  
  // Clear, descriptive function names
  const startTimer = useCallback(() => {
    // Implementation
  }, []);

  return { timeRemaining, startTimer };
};

// ❌ Avoid: Unclear naming and loose typing  
const useTimer = (time: any) => {
  const [t, setT] = useState(time);
  const start = () => { /* ... */ };
  return { t, start };
};
```

### React Component Guidelines
```typescript
// ✅ Preferred component structure
interface GameBoardProps {
  readonly gameId: string;
  readonly isMultiplayer: boolean;
  readonly onGameEnd: (result: GameResult) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  gameId, 
  isMultiplayer, 
  onGameEnd 
}) => {
  // Hooks first
  const [gameState, setGameState] = useState<GameState>(initialState);
  const { makeMove, isValidMove } = useGameLogic(gameId);

  // Event handlers
  const handleMove = useCallback((move: GameMove) => {
    if (isValidMove(move)) {
      makeMove(move);
    }
  }, [isValidMove, makeMove]);

  // Render
  return (
    <div className="game-board" role="application" aria-label="Game Board">
      {/* Component content */}
    </div>
  );
};
```

### CSS/Styling Guidelines
- Use **CSS Modules** for component styles
- Follow **mobile-first** responsive design
- Use **CSS custom properties** for theming
- Include **focus states** for accessibility
- Optimize for **performance** and **readability**

```css
/* ✅ Good: Mobile-first with clear naming */
.gameBoard {
  display: grid;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-background);
  border-radius: var(--border-radius);
}

@media (min-width: 768px) {
  .gameBoard {
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
  }
}

/* Focus states for accessibility */
.gameButton:focus {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
```

## 🧪 Testing Requirements

### What to Test
- **Game logic**: Unit tests for core mechanics
- **Components**: React component behavior
- **Integration**: Platform service integration
- **Accessibility**: Keyboard navigation and screen readers
- **Performance**: Frame rates and load times

### Testing Tools
- **Vitest**: Unit and integration testing
- **React Testing Library**: Component testing
- **Playwright**: End-to-end testing (future)
- **Lighthouse**: Performance and accessibility audits

### Example Tests
```typescript
// Game logic testing
describe('SudokuEngine', () => {
  it('should validate number placement', () => {
    const engine = new SudokuEngine();
    const isValid = engine.isValidMove({ row: 0, col: 0, value: 5 });
    expect(isValid).toBe(true);
  });
});

// Component testing  
describe('GameBoard', () => {
  it('should handle user moves', () => {
    render(<GameBoard gameId="test" isMultiplayer={false} onGameEnd={jest.fn()} />);
    const cell = screen.getByRole('button', { name: /row 0 column 0/i });
    fireEvent.click(cell);
    // Assert expected behavior
  });
});
```

## 🎮 Game Contribution Guidelines

### Game Selection Criteria
Games should be:
- **Accessible**: Easy to learn, engaging to play
- **Cross-platform**: Work well on mobile and desktop
- **Multiplayer-ready**: Can benefit from real-time features
- **Technically feasible**: Fit within platform constraints

### Game Implementation Checklist
#### Core Features
- [ ] **Game engine**: Pure TypeScript logic
- [ ] **React UI**: Responsive components
- [ ] **State management**: Platform integration
- [ ] **Error handling**: Graceful failure recovery
- [ ] **Performance**: 60 FPS on mobile devices

#### Platform Integration  
- [ ] **Multiplayer support**: WebSocket integration
- [ ] **Offline functionality**: Works without internet
- [ ] **State synchronization**: Cross-device consistency
- [ ] **Player management**: Multi-player sessions

#### Quality Assurance
- [ ] **Testing**: Unit and integration tests
- [ ] **Accessibility**: WCAG 2.1 AA compliance
- [ ] **Mobile optimization**: Touch-friendly controls
- [ ] **Documentation**: Game-specific documentation
- [ ] **Performance testing**: Validated on target devices

### Game Documentation Requirements
Each game should include:
- **README.md**: Game overview and features
- **API.md**: Public API documentation
- **CONTROLS.md**: Input controls and shortcuts
- **RULES.md**: Complete game rules and mechanics

## 📝 Pull Request Guidelines

### Before Submitting
- [ ] **Test thoroughly** on multiple devices/browsers
- [ ] **Run linting**: `npm run lint` passes
- [ ] **Build successfully**: `npm run build` completes
- [ ] **Update documentation** as needed
- [ ] **Add tests** for new functionality

### PR Description Template
```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature  
- [ ] Game implementation
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Cross-browser testing done
- [ ] Mobile testing completed

## Screenshots
Include screenshots of UI changes or new games.

## Checklist
- [ ] Code follows project standards
- [ ] Self-reviewed code changes
- [ ] Documentation updated
- [ ] No console errors or warnings
```

### Review Process
1. **Automated checks**: CI/CD pipeline runs tests and builds
2. **Code review**: Maintainers review code quality and standards
3. **Testing review**: Functionality testing across devices
4. **Documentation review**: Ensure documentation is complete
5. **Final approval**: Merge when all requirements are met

## 🎯 Good First Issues

New contributors should look for issues labeled:
- **good first issue**: Perfect for newcomers
- **documentation**: Documentation improvements
- **bug**: Small bug fixes
- **enhancement**: Minor feature improvements

### Beginner-Friendly Tasks
- Fix typos in documentation
- Improve error messages
- Add unit tests for existing functions
- Implement simple UI improvements
- Add accessibility features

## 🌟 Recognition

### Contributors
All contributors are recognized in:
- **README.md**: Contributors section
- **CONTRIBUTORS.md**: Detailed contribution list
- **Release notes**: Major contribution highlights
- **GitHub**: Contributor graphs and statistics

### Ways We Say Thank You
- **Mention** in release notes for significant contributions
- **Feature** your games prominently in the app
- **Feedback** and guidance for professional growth
- **References** and recommendations when appropriate

## 🚫 Code of Conduct

### Our Standards
- **Be respectful**: Treat everyone with kindness and respect
- **Be inclusive**: Welcome contributors from all backgrounds
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Help newcomers learn and grow
- **Be professional**: Maintain appropriate language and behavior

### Unacceptable Behavior
- Harassment, discrimination, or offensive language
- Personal attacks or public/private harassment
- Publishing private information without consent
- Spam, trolling, or disruptive behavior
- Any conduct harmful to the community

### Enforcement
- **Report issues** to maintainers via private message
- **Consequences** may include warnings, temporary bans, or permanent bans
- **Appeals process** available for disputed actions

## ❓ Questions and Support

### Getting Help
- **Documentation**: Check README, DEVELOPMENT.md, and other docs
- **Issues**: Search existing issues for solutions
- **Discussions**: Ask questions in GitHub Discussions
- **Community**: Join our Discord server (link coming soon)

### Contact
- **General questions**: Create a GitHub Discussion
- **Bug reports**: Create a GitHub Issue
- **Security concerns**: Email maintainers privately
- **Code of conduct issues**: Report to maintainers

## 🙏 Thank You

Thank you for contributing to Mini-games! Your efforts help create an amazing gaming platform for players worldwide. Whether you're fixing bugs, adding features, implementing games, or improving documentation, every contribution makes a difference.

Happy coding! 🎮