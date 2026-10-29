// Measure rather than assume a fixed height: zoom and focus modes change it.
const header = document.querySelector<HTMLElement>('.site-header');
if (header) {
  const measure = () => document.documentElement.style.setProperty('--tool-header-height', `${header.getBoundingClientRect().height}px`);
  new ResizeObserver(measure).observe(header);
  measure();
}

export {};
