(() => {
  const marketCards = document.getElementById('marketCards');
  if (!marketCards) return;

  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  if (!descriptor?.get || !descriptor?.set) return;

  let lastMarkup = '';
  Object.defineProperty(marketCards, 'innerHTML', {
    configurable: true,
    get() {
      return descriptor.get.call(this);
    },
    set(markup) {
      const active = document.activeElement;
      const interacting = active && this.contains(active);

      // The main render loop runs every animation frame. Replacing the
      // Marketspace DOM while a select or button is focused cancels the
      // user's interaction, so keep the current nodes alive until focus leaves.
      if (interacting) return;
      if (markup === lastMarkup) return;

      lastMarkup = markup;
      descriptor.set.call(this, markup);
    }
  });
})();
