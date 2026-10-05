export function createFlipClock(root: HTMLElement) {
  let previous = '';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function half(value: string, position: string, animated = false) {
    const face = document.createElement('span');
    face.className = `flip-half flip-${position}${animated ? ' flip-moving' : ''}`;
    const glyph = document.createElement('span'); glyph.textContent = value; face.append(glyph);
    return face;
  }
  return (parts: Intl.DateTimeFormatPart[], animate: boolean) => {
    const values = parts.filter(p => ['hour','minute','second'].includes(p.type)).map(p => p.value.padStart(2,'0'));
    const signature = values.join(':');
    if (signature === previous) return;
    const old = previous;
    previous = signature;
    if (old.length !== signature.length || !root.children.length) {
      root.replaceChildren();
      for (const ch of signature) {
        const cell = document.createElement('span');
        cell.className = ch === ':' ? 'flip-separator' : 'flip-digit';
        if(ch === ':') cell.textContent = ':';
        else { cell.dataset.value = ch; cell.append(half(ch,'top'),half(ch,'bottom')); }
        root.append(cell);
      }
      return;
    }
    [...root.children].forEach((element,index) => {
      const cell = element as HTMLElement, ch = signature[index];
      if(ch === ':' || cell.dataset.value === ch) return;
      const before = cell.dataset.value!;cell.dataset.value = ch;
      cell.replaceChildren(half(ch,'top'),half(ch,'bottom'));
      if(!animate || motion.matches) return;
      const top=half(before,'top',true),bottom=half(ch,'bottom',true);
      cell.append(top,bottom);
      top.addEventListener('animationend',()=>top.remove(),{once:true});
      bottom.addEventListener('animationend',()=>bottom.remove(),{once:true});
    });
  };
}
