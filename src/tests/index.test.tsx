import { render, screen } from '@testing-library/react';
import Home, { FeaturesCards, CourseCard } from '../src/pages/index.tsx';

describe('Home component', () => {
  it('renders without crashing', () => {
    render(<Home />);
    expect(screen.getByText('UIUC.chat')).toBeInTheDocument();
  });
});

describe('FeaturesCards component', () => {
  it('renders the correct number of cards', () => {
    render(<FeaturesCards />);
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(3);
  });

  it('each card contains the expected elements', () => {
    render(<FeaturesCards />);
    const cards = screen.getAllByRole('article');
    cards.forEach(card => {
      expect(card).toHaveTextContent(/Faster than ChatGPT, with better prompts|Course Specific|Upload anything, get answers/i);
    });
  });
});

describe('CourseCard component', () => {
  it('renders the correct number of cards', () => {
    render(<CourseCard />);
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(8);
  });

  it('each card contains the expected elements', () => {
    render(<CourseCard />);
    const cards = screen.getAllByRole('article');
    cards.forEach(card => {
      expect(card).toHaveTextContent(/Electrical & Computer Engineering, ECE 120|NCSA|NCSA Delta Documentation|Clowder docs|Crop Wizard|Langchain|Ansible|Lilian Wang Blog (OpenAI popular topics)/i);
    });
  });
});
