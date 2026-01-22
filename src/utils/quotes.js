/**
 * Motivational Quotes Module (US-077)
 * Collection of motivational quotes for productivity and goal tracking
 */

/**
 * Collection of motivational quotes
 * Each quote has text and an optional author
 * @type {Array<{text: string, author: string}>}
 */
const MOTIVATIONAL_QUOTES = [
  // Discipline and Consistency
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "A year from now you will wish you had started today.", author: "Karen Lamb" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },

  // Progress and Growth
  { text: "Progress, not perfection, is what we should be asking of ourselves.", author: "Julia Cameron" },
  { text: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius" },
  { text: "Every accomplishment starts with the decision to try.", author: "John F. Kennedy" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "What gets measured gets managed.", author: "Peter Drucker" },
  { text: "Dream big. Start small. Act now.", author: "Robin Sharma" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The difference between try and triumph is just a little umph!", author: "Marvin Phillips" },

  // Motivation and Mindset
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Your limitation—it's only your imagination.", author: "" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "" },
  { text: "Sometimes later becomes never. Do it now.", author: "" },
  { text: "Great things never come from comfort zones.", author: "" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "" },
  { text: "Do something today that your future self will thank you for.", author: "" },
  { text: "Little things make big days.", author: "" },
  { text: "It's going to be hard, but hard does not mean impossible.", author: "" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "" },

  // Goals and Achievement
  { text: "A goal without a plan is just a wish.", author: "Antoine de Saint-Exupéry" },
  { text: "Setting goals is the first step in turning the invisible into the visible.", author: "Tony Robbins" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "Goals are dreams with deadlines.", author: "Diana Scharf" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { text: "By failing to prepare, you are preparing to fail.", author: "Benjamin Franklin" },
  { text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Zig Ziglar" },
  { text: "If you want to achieve greatness stop asking for permission.", author: "Anonymous" },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },

  // Time and Persistence
  { text: "Lost time is never found again.", author: "Benjamin Franklin" },
  { text: "Time is what we want most, but what we use worst.", author: "William Penn" },
  { text: "The only thing standing between you and your goal is the story you keep telling yourself.", author: "Jordan Belfort" },
  { text: "Don't let yesterday take up too much of today.", author: "Will Rogers" },
  { text: "You don't always get what you wish for, but you get what you work for.", author: "" },
  { text: "One day or day one. You decide.", author: "" },
  { text: "Stay focused. Stay determined. Stay relentless.", author: "" },
  { text: "Success doesn't come from what you do occasionally, it comes from what you do consistently.", author: "Marie Forleo" },
  { text: "Your only limit is you.", author: "" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },

  // Celebration and Reflection
  { text: "Celebrate what you've accomplished, but raise the bar a little higher each time you succeed.", author: "Mia Hamm" },
  { text: "Every day is a new opportunity to change your life.", author: "" },
  { text: "Success is liking yourself, liking what you do, and liking how you do it.", author: "Maya Angelou" },
  { text: "Be proud of how hard you are trying.", author: "" },
  { text: "You've come this far, don't quit now.", author: "" },
  { text: "Good things come to those who hustle.", author: "" },
  { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
  { text: "Strive for progress, not perfection.", author: "" },
  { text: "The only bad workout is the one that didn't happen.", author: "" },
  { text: "Today's accomplishments were yesterday's impossibilities.", author: "Robert H. Schuller" }
];

/**
 * Get a random motivational quote
 * @returns {{text: string, author: string}} A random quote object
 */
function getRandomQuote() {
  const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
  return MOTIVATIONAL_QUOTES[randomIndex];
}

/**
 * Get a random quote with seeded randomness based on date
 * This ensures the same quote is shown throughout the day but changes daily
 * @param {string} seed - Seed string (e.g., date string) for consistent daily quote
 * @returns {{text: string, author: string}} A quote object
 */
function getDailyQuote(seed = null) {
  if (!seed) {
    // Use today's date as the seed
    const today = new Date();
    seed = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  }

  // Simple hash function to convert seed to number
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use absolute value to ensure positive index
  const index = Math.abs(hash) % MOTIVATIONAL_QUOTES.length;
  return MOTIVATIONAL_QUOTES[index];
}

/**
 * Get all available quotes
 * @returns {Array<{text: string, author: string}>} All quotes
 */
function getAllQuotes() {
  return [...MOTIVATIONAL_QUOTES];
}

/**
 * Get the total number of quotes
 * @returns {number} Number of quotes in the collection
 */
function getQuoteCount() {
  return MOTIVATIONAL_QUOTES.length;
}

/**
 * Render a quote as HTML
 * @param {{text: string, author: string}} quote - The quote object
 * @param {string} className - Optional additional class name
 * @returns {string} HTML string for the quote
 */
function renderQuoteHTML(quote, className = '') {
  const authorText = quote.author ? `<span class="quote-author">— ${quote.author}</span>` : '';
  return `
    <div class="motivational-quote ${className}">
      <p class="quote-text">"${quote.text}"</p>
      ${authorText}
    </div>
  `;
}

export {
  MOTIVATIONAL_QUOTES,
  getRandomQuote,
  getDailyQuote,
  getAllQuotes,
  getQuoteCount,
  renderQuoteHTML
};
