export const RULES: Rule[] = [
    { tag: 'Inbox', rule: () => true },
    { tag: 'Wishlist', rule: 'wishlist|вишлист|хочу|want' },
    { tag: 'Actionable', rule: 'todo|делать' },
    { tag: 'To Watch', rule: 'watch|read|читать|book|книга|фильм|movie|series|сериал|подкаст|podcast|советует|смотреть' },
    { tag: 'Anki', rule: 'anki|анки|колода|deck' },
    { tag: 'Shower thoughts', rule: /(^|\s)?(хм+|hm+)/mui },
    { tag: 'Article Ideas', rule: 'пост|article' },
    { tag: 'Shopping List', rule: 'купить|buy' },
    { tag: 'Lena', rule: 'лена|лене|лену|lena|volzhina|волжина' },
    { tag: 'Friday', rule: 'friday|фрайдей|фр' },
]
