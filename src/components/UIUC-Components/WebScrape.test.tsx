import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import nock from 'nock';
import WebScrape from './WebScrape';

describe('WebScrape component', () => {
  test('renders without crashing', () => {
    const { getByPlaceholderText } = render(<WebScrape />);
    expect(getByPlaceholderText('Enter URL')).toBeInTheDocument();
  });

  test('validateUrl function works correctly', () => {
    const { getByPlaceholderText } = render(<WebScrape />);
    const input = getByPlaceholderText('Enter URL');
    fireEvent.change(input, { target: { value: 'https://validurl.com' } });
    expect(input.value).toBe('https://validurl.com');
    fireEvent.change(input, { target: { value: 'invalidurl' } });
    expect(input.value).toBe('invalidurl');
  });

  test('handleSubmit function works correctly', async () => {
    const { getByPlaceholderText, getByText } = render(<WebScrape />);
    const input = getByPlaceholderText('Enter URL');
    fireEvent.change(input, { target: { value: 'https://validurl.com' } });
    const button = getByText('Ingest');
    fireEvent.click(button);
    await new Promise((r) => setTimeout(r, 2000));
    expect(getByText('Web scraping started')).toBeInTheDocument();
  });

  test('scrapeWeb function works correctly', async () => {
    nock('https://flask-production-751b.up.railway.app')
      .get('/web-scrape')
      .reply(200, { data: 'scraped data' });
    const { getByPlaceholderText, getByText } = render(<WebScrape />);
    const input = getByPlaceholderText('Enter URL');
    fireEvent.change(input, { target: { value: 'https://validurl.com' } });
    const button = getByText('Ingest');
    fireEvent.click(button);
    await new Promise((r) => setTimeout(r, 2000));
    expect(getByText('scraped data')).toBeInTheDocument();
  });

  test('downloadMITCourse function works correctly', async () => {
    nock('https://flask-production-751b.up.railway.app')
      .get('/mit-download')
      .reply(200, { data: 'downloaded data' });
    const { getByPlaceholderText, getByText } = render(<WebScrape />);
    const input = getByPlaceholderText('Enter URL');
    fireEvent.change(input, { target: { value: 'https://ocw.mit.edu' } });
    const button = getByText('Ingest');
    fireEvent.click(button);
    await new Promise((r) => setTimeout(r, 2000));
    expect(getByText('downloaded data')).toBeInTheDocument();
  });
});
