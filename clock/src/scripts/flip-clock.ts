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
      // Reveal the new upper glyph only when the outgoing upper leaf is gone.
      const incomingTopGlyph = cell.children[0].firstElementChild!;
      incomingTopGlyph.classList.add('flip-incoming-top');
      // Hide the old lower glyph at 75% of the full two-stage flip.
      const restingBottom = cell.children[1] as HTMLElement;
      const outgoingGlyph = restingBottom.firstElementChild!;
      outgoingGlyph.textContent = before;
      outgoingGlyph.classList.add('flip-outgoing-glyph');
      const top=half(before,'top',true),bottom=half(ch,'bottom',true);
      cell.append(top,bottom);
      top.addEventListener('animationend',()=>{
        top.remove();
        incomingTopGlyph.classList.remove('flip-incoming-top');
      },{once:true});
      bottom.addEventListener('animationend',()=>{
        outgoingGlyph.classList.remove('flip-outgoing-glyph');
        outgoingGlyph.textContent = ch;
        bottom.remove();
      },{once:true});
    });
  };
}
