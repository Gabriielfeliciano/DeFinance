import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  const appliedTheme = () => document.documentElement.dataset['theme'];

  function stubSystemPreference(prefersLight: boolean) {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: prefersLight && query === '(prefers-color-scheme: light)' })),
    );
  }

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('starts with the saved theme and applies it to <html>', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('light');
    expect(appliedTheme()).toBe('light');
  });

  it('follows the system preference when nothing is saved', () => {
    stubSystemPreference(true);
    expect(TestBed.inject(ThemeService).theme()).toBe('light');
  });

  it('defaults to dark without a saved or system preference', () => {
    stubSystemPreference(false);
    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
  });

  it('ignores an invalid saved value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
  });

  it('toggles, applies and remembers the choice', () => {
    const service = TestBed.inject(ThemeService);
    service.toggle();
    expect(service.theme()).toBe('light');
    expect(appliedTheme()).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    service.toggle();
    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('keeps working when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('dark');
    expect(() => service.toggle()).not.toThrow();
    expect(appliedTheme()).toBe('light');
  });
});
