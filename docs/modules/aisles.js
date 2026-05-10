// Maps canonical ingredient names (the same ones the pantry picker uses)
// to a shopping-list aisle, so the meal-plan shopping list can group
// items the way they appear in a supermarket.
//
// Match by longest substring: "red onion" lands in "produce" because
// "onion" is a produce keyword. First-aisle-with-a-match wins, so the
// list order below also acts as priority order.

export const AISLE_KEYS = ['produce', 'meat', 'fish', 'dairy', 'bakery', 'pantry', 'spices', 'other'];

export const AISLE_LABELS = {
  produce: 'Produce',
  meat: 'Meat',
  fish: 'Fish & seafood',
  dairy: 'Dairy & eggs',
  bakery: 'Bakery',
  pantry: 'Pantry',
  spices: 'Spices & herbs',
  other: 'Other',
};

const AISLE_KEYWORDS = {
  produce: [
    'onion', 'shallot', 'garlic', 'leek', 'spring onion', 'scallion', 'chive',
    'tomato', 'cherry tomato', 'sun-dried tomato',
    'carrot', 'celery', 'celeriac', 'fennel', 'parsnip', 'turnip', 'radish', 'daikon', 'beetroot', 'beet',
    'potato', 'sweet potato', 'yam', 'yuca', 'cassava', 'plantain',
    'pepper', 'bell pepper', 'red pepper', 'green pepper', 'chilli', 'chili', 'jalapeño', 'jalapeno', 'scotch bonnet', 'habanero', 'serrano', 'birds eye', 'bird\'s eye',
    'lettuce', 'romaine', 'rocket', 'arugula', 'spinach', 'kale', 'chard', 'collard', 'cabbage', 'bok choy', 'pak choi',
    'cucumber', 'courgette', 'zucchini', 'aubergine', 'eggplant', 'squash', 'pumpkin', 'butternut', 'kabocha',
    'mushroom', 'shiitake', 'oyster mushroom', 'porcini', 'chestnut mushroom',
    'parsley', 'coriander', 'cilantro', 'basil', 'mint', 'dill', 'thyme', 'rosemary', 'sage', 'tarragon', 'oregano',
    'lime', 'lemon', 'orange', 'grapefruit',
    'apple', 'pear', 'banana', 'mango', 'pineapple', 'peach', 'plum', 'cherry', 'berry', 'raspberry', 'strawberry', 'blueberry', 'blackberry', 'pomegranate',
    'avocado', 'olive', 'date', 'fig', 'raisin', 'sultana', 'currant',
    'ginger', 'galangal', 'turmeric', 'lemongrass', 'kaffir lime',
    'asparagus', 'broccoli', 'cauliflower', 'green bean', 'long bean', 'pea', 'mange-tout', 'snow pea', 'snap pea', 'sugar snap', 'beansprout',
    'corn', 'sweetcorn', 'baby corn',
    'banana flower', 'lotus', 'taro', 'jicama',
  ],
  meat: [
    'chicken', 'turkey', 'duck', 'goose', 'quail',
    'beef', 'sirloin', 'tenderloin', 'rib-eye', 'ribeye', 't-bone', 'brisket', 'oxtail', 'steak', 'rump',
    'pork', 'bacon', 'pancetta', 'gammon', 'ham', 'prosciutto', 'chorizo', 'salami', 'pepperoni', 'sausage', 'mince',
    'lamb', 'mutton',
    'venison', 'rabbit', 'veal',
  ],
  fish: [
    'salmon', 'tuna', 'cod', 'trout', 'mackerel', 'haddock', 'plaice', 'sole', 'sea bass', 'seabass', 'bream', 'snapper', 'halibut', 'monkfish', 'pollock', 'herring',
    'prawn', 'shrimp', 'crab', 'lobster', 'mussel', 'clam', 'oyster', 'scallop', 'squid', 'octopus', 'calamari', 'crayfish', 'crawfish',
    'anchovy', 'sardine', 'kipper', 'fish sauce', 'fish stock',
  ],
  dairy: [
    'milk', 'buttermilk', 'cream', 'soured cream', 'sour cream', 'crème fraîche', 'creme fraiche',
    'butter', 'ghee',
    'yogurt', 'yoghurt', 'kefir', 'skyr', 'quark',
    'cheese', 'cheddar', 'parmesan', 'mozzarella', 'feta', 'halloumi', 'paneer', 'ricotta', 'mascarpone', 'gruyère', 'gruyere', 'emmental', 'brie', 'gorgonzola', 'stilton',
    'egg',
  ],
  bakery: [
    'bread', 'baguette', 'sourdough', 'pita', 'tortilla', 'flatbread', 'naan', 'roti', 'paratha', 'lavash', 'taboon', 'shrak', 'bun', 'roll',
    'filo', 'phyllo', 'pastry', 'pie crust', 'breadcrumb',
  ],
  pantry: [
    'flour', 'plain flour', 'self-raising flour', 'bread flour', 'cornflour', 'cornstarch', 'rice flour', 'tapioca', 'semolina', 'polenta', 'cornmeal',
    'sugar', 'caster sugar', 'brown sugar', 'icing sugar', 'demerara', 'palm sugar', 'maple syrup', 'honey', 'golden syrup', 'molasses', 'treacle',
    'salt', 'sea salt', 'flaky salt', 'kosher salt',
    'rice', 'basmati', 'jasmine', 'risotto', 'arborio', 'short-grain', 'long-grain', 'brown rice', 'wild rice',
    'pasta', 'noodle', 'spaghetti', 'fettuccine', 'tagliatelle', 'penne', 'lasagne', 'ravioli', 'gnocchi', 'vermicelli', 'rice noodle', 'glass noodle', 'dangmyeon',
    'lentil', 'chickpea', 'bean', 'kidney bean', 'black bean', 'cannellini', 'borlotti', 'butter bean', 'split pea', 'fava bean',
    'oil', 'olive oil', 'vegetable oil', 'sunflower oil', 'sesame oil', 'coconut oil',
    'vinegar', 'wine vinegar', 'cider vinegar', 'rice vinegar', 'balsamic',
    'wine', 'sherry', 'mirin', 'sake', 'shaoxing', 'rum', 'bourbon', 'cognac', 'brandy',
    'soy sauce', 'tamari', 'kecap manis', 'oyster sauce', 'hoisin', 'sriracha', 'sambal', 'gochujang', 'doubanjiang', 'doenjang', 'miso',
    'stock', 'broth', 'bouillon',
    'tomato paste', 'tomato puree', 'passata', 'tomatoes (tin)', 'tinned tomato', 'chopped tomato',
    'coconut milk', 'coconut cream',
    'tahini', 'peanut butter',
    'mustard', 'capers', 'gherkin', 'pickle',
    'almond', 'walnut', 'pistachio', 'cashew', 'pecan', 'hazelnut', 'pine nut', 'peanut', 'sesame seed', 'poppy seed',
    'rosewater', 'orange blossom', 'vanilla',
    'chocolate', 'cocoa',
    'baking powder', 'bicarbonate', 'yeast',
    'tofu', 'tempeh', 'jameed', 'kombu', 'nori',
    'gelatine', 'gelatin', 'agar',
  ],
  spices: [
    'cumin', 'coriander seed', 'paprika', 'cinnamon', 'cardamom', 'clove', 'nutmeg', 'mace', 'allspice',
    'turmeric', 'fenugreek', 'mustard seed', 'fennel seed', 'caraway', 'star anise',
    'sumac', 'za\'atar', 'zaatar', 'baharat', 'ras el hanout', 'berbere', 'harissa',
    'pepper', 'black pepper', 'white pepper', 'peppercorn', 'sichuan peppercorn',
    'cayenne', 'aleppo pepper', 'ancho', 'chipotle', 'gochugaru',
    'curry powder', 'curry paste', 'garam masala', 'tikka masala',
    'saffron', 'bay leaf', 'curry leaf',
    'dried chilli', 'chilli flakes', 'crushed chilli',
  ],
};

// Pre-compute longest-first lookup arrays so the matcher returns the
// most-specific keyword (e.g. "spring onion" before "onion").
const SORTED = {};
for (const aisle of AISLE_KEYS) {
  const list = AISLE_KEYWORDS[aisle] || [];
  SORTED[aisle] = [...list].sort((a, b) => b.length - a.length);
}

// Returns the aisle key that best matches an ingredient name. "Other"
// when no keyword matches. Match is case-insensitive substring; the
// keyword need not be a whole word so "kidney beans" → produce/pantry
// via "kidney bean".
export function aisleFor(name) {
  if (!name) return 'other';
  const lc = String(name).toLowerCase();
  for (const aisle of AISLE_KEYS) {
    if (aisle === 'other') continue;
    for (const kw of SORTED[aisle]) {
      if (lc.includes(kw)) return aisle;
    }
  }
  return 'other';
}
