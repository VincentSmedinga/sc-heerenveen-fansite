// Puts the theme a visitor chose on the html element before the first paint, so a dark choice on a light system never
// flashes light. A classic script in the head of every page (see src/app/layout.tsx); src/theme.ts takes over once the
// page has loaded. Without a choice it does nothing, and the colours follow the system. Keep the key and the rule the
// same as in src/theme.ts.
;(() => {
  try {
    const choice = localStorage.getItem('fansite-theme')

    if (choice === 'light' || choice === 'dark') {
      document.documentElement.dataset.theme = choice
    }
  } catch {
    // Storage can be blocked: follow the system then.
  }
})()
