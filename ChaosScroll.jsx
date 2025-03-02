import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/ChaosScroll.css';

const ChaosScroll = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState('all');
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [revealedAnswers, setRevealedAnswers] = useState({});
  const [seenContent, setSeenContent] = useState(new Set());
  const [seenMemeUrls, setSeenMemeUrls] = useState(new Set());
  const [memeSubreddits, setMemeSubreddits] = useState([
    'memes', 'dankmemes', 'wholesomememes', 'funny', 'AdviceAnimals', 
    'PrequelMemes', 'ProgrammerHumor', 'marvelmemes', 'historymemes',
    'darkjokes', 'darkmemers', 'darkhumorjokes', 'darkhumourmemes', 
    'offensivejokes', 'Memes_Of_The_Dank', 'ImGoingToHellForThis',
    'holup', 'cursedcomments', 'blursedimages', 'cursedimages',
    'surrealmemes', 'antimeme', 'bonehurtingjuice', 'okbuddyretard',
    'comedyheaven', 'deepfriedmemes', 'nukedmemes', 'ComedyCemetery',
    'AnimalsBeingDerps', 'AnimalsBeingJerks', 'aww', 'Eyebleach'
  ]);
  const observer = useRef();
  const loadingTriggerRef = useRef(null);
  const categoryFilterRef = useRef();

  // Reaction types
  const reactions = {
    like: { emoji: '❤️', label: 'Like' },
    laugh: { emoji: '😂', label: 'Laugh' },
    wow: { emoji: '😮', label: 'Wow' },
    sad: { emoji: '😢', label: 'Sad' },
    thumbsUp: { emoji: '👍', label: 'Thumbs up' },
    thumbsDown: { emoji: '👎', label: 'Thumbs down' },
    save: { emoji: '🔖', label: 'Save' }
  };

  // Define theme colors
  const theme = {
    light: {
      bgPrimary: '#ffffff',
      bgSecondary: 'rgba(248, 249, 250, 0.85)',
      textPrimary: '#333333',
      textSecondary: '#666666',
      borderColor: '#e0e0e0',
      cardShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
      buttonBg: '#f8f9fa',
      buttonShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      reactionBg: '#f0f2f5',
      categories: {
        fact: '#3a86ff',
        joke: '#ff006e',
        quote: '#8338ec',
        word: '#fb5607',
        trivia: '#ffbe0b',
        meme: '#8338ec',
        image: '#06d6a0',
        all: '#333333'
      }
    },
    dark: {
      bgPrimary: '#1a1a1a',
      bgSecondary: 'rgba(30, 30, 30, 0.85)',
      textPrimary: '#f0f0f0',
      textSecondary: '#b0b0b0',
      borderColor: '#333333',
      cardShadow: '0 6px 16px rgba(0, 0, 0, 0.25)',
      buttonBg: '#2a2a2a',
      buttonShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      reactionBg: '#2c2c2c',
      categories: {
        fact: '#3a86ff',
        joke: '#ff006e',
        quote: '#8338ec',
        word: '#fb5607',
        trivia: '#ffbe0b',
        meme: '#8338ec',
        image: '#06d6a0',
        all: '#bbbbbb'
      }
    }
  };
  
  // Get current theme
  const currentTheme = darkMode ? theme.dark : theme.light;

  // API endpoints with multiple meme sources
  const APIs = {
    // Text content
    FACTS: 'https://uselessfacts.jsph.pl/api/v2/facts/random',
    JOKES: 'https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist,sexist,explicit',
    QUOTES: 'https://api.quotable.io/random',
    NINJA_QUOTES: 'https://api.api-ninjas.com/v1/quotes',
    
    // Word related
    WORDS: 'https://api.api-ninjas.com/v1/randomword',
    DEFINITIONS: 'https://api.dictionaryapi.dev/api/v2/entries/en/',
    
    // Knowledge
    TRIVIA: 'https://api.api-ninjas.com/v1/trivia',
    OPEN_TRIVIA: 'https://opentdb.com/api.php?amount=1&type=multiple',
    
    // Visual content
    MEMES: 'https://meme-api.com/gimme', // Base meme API
    MEMES_SUBREDDIT: (subreddit) => `https://meme-api.com/gimme/${subreddit}`, // Subreddit-specific
    MEMES_MULTIPLE: (subreddit, count) => `https://meme-api.com/gimme/${subreddit}/${count}` // Multiple memes
  };

  // API key for Ninja APIs
  const NINJA_API_KEY = "DjJroHfI49IiZl/JE/PlVA==tbJCVf99lu5tyST9";

  // API status tracking
  const [apiStatus, setApiStatus] = useState({
    FACTS: true,
    JOKES: true,
    QUOTES: true,
    NINJA_QUOTES: true,
    WORDS: true,
    DEFINITIONS: true,
    TRIVIA: true,
    MEMES: true
  });

  // Debug function to log API status
  const logApiStatus = () => {
    console.log("Current API Status:", apiStatus);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    
    // Update body class for global styling
    if (newMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    
    // Save preference
    localStorage.setItem('darkMode', newMode.toString());
  };

  // Toggle answer reveal for trivia
  const toggleAnswer = (id) => {
    setRevealedAnswers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Apply theme to document on mount and when theme changes
  useEffect(() => {
    // Set CSS variables on the document root
    const root = document.documentElement;
    
    // Set theme variables
    Object.entries(currentTheme).forEach(([key, value]) => {
      if (typeof value === 'object') {
        // Handle nested objects like categories
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          root.style.setProperty(`--${key}-${nestedKey}`, nestedValue);
        });
      } else {
        root.style.setProperty(`--${key}`, value);
      }
    });
    
    // Set initial body class
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode, currentTheme]);

  // Categories with display names
  const categories = {
    all: { name: 'All', color: currentTheme.categories.all },
    fact: { name: 'Facts', color: currentTheme.categories.fact },
    joke: { name: 'Jokes', color: currentTheme.categories.joke },
    quote: { name: 'Quotes', color: currentTheme.categories.quote },
    word: { name: 'Words', color: currentTheme.categories.word },
    trivia: { name: 'Trivia', color: currentTheme.categories.trivia },
    meme: { name: 'Memes', color: currentTheme.categories.meme }
  };

  // Function to get a random subreddit with preference for dark humor
  const getRandomSubreddit = (preferDark = false) => {
    // Dark humor subreddits
    const darkSubreddits = [
      'darkjokes', 'darkmemers', 'darkhumorjokes', 'darkhumourmemes', 
      'offensivejokes', 'Memes_Of_The_Dank', 'ImGoingToHellForThis',
      'holup', 'cursedcomments', 'blursedimages', 'cursedimages'
    ];
    
    if (preferDark) {
      // 70% chance to pick from dark subreddits
      if (Math.random() < 0.7 && darkSubreddits.length > 0) {
        return darkSubreddits[Math.floor(Math.random() * darkSubreddits.length)];
      }
    }
    
    // Otherwise pick from all subreddits
    return memeSubreddits[Math.floor(Math.random() * memeSubreddits.length)];
  };

  // Modified fetchRandomContent for better meme variety including dark humor
  const fetchRandomContent = async (type) => {
    try {
      console.log(`Attempting to fetch ${type}...`);
      
      switch (type) {
        case 'fact':
          const factResponse = await fetch(APIs.FACTS);
          if (!factResponse.ok) throw new Error('Facts API failed');
          const factData = await factResponse.json();
          return {
            type: 'fact',
            content: factData.text,
            id: `fact-${Date.now()}-${Math.random()}`,
            likes: 0,
            timestamp: new Date().toISOString()
          };

        case 'joke':
          const jokeResponse = await fetch(APIs.JOKES);
          if (!jokeResponse.ok) throw new Error('Jokes API failed');
          const jokeData = await jokeResponse.json();
          const jokeContent = jokeData.type === 'single' 
            ? jokeData.joke 
            : `${jokeData.setup}\n\n${jokeData.delivery}`;
          return {
            type: 'joke',
            content: jokeContent,
            id: `joke-${Date.now()}-${Math.random()}`,
            likes: 0,
            timestamp: new Date().toISOString()
          };

        case 'quote':
          // Try the Ninja Quotes API first (with your provided API key)
          try {
            const ninjaQuoteResponse = await fetch(APIs.NINJA_QUOTES, {
            headers: {
                'X-Api-Key': NINJA_API_KEY
              }
            });
            
            if (!ninjaQuoteResponse.ok) throw new Error('Ninja Quotes API failed');
            
            const ninjaQuoteData = await ninjaQuoteResponse.json();
            console.log('Ninja Quote API response:', ninjaQuoteData);
            
            if (ninjaQuoteData && ninjaQuoteData.length > 0) {
              const quote = ninjaQuoteData[0];
          return {
                type: 'quote',
                content: `"${quote.quote}" — ${quote.author}`,
                category: quote.category,
                id: `quote-${Date.now()}-${Math.random()}`,
                likes: 0,
                timestamp: new Date().toISOString()
              };
            }
          } catch (ninjaError) {
            console.error('Error with Ninja Quotes API:', ninjaError);
            setApiStatus(prev => ({ ...prev, NINJA_QUOTES: false }));
            // Fall back to the quotable.io API
          }
          
          // Fallback to quotable.io if Ninja API fails
          const quoteResponse = await fetch(APIs.QUOTES);
          if (!quoteResponse.ok) throw new Error('Quotes API failed');
          const quoteData = await quoteResponse.json();
          return {
            type: 'quote',
            content: `"${quoteData.content}" — ${quoteData.author}`,
            id: `quote-${Date.now()}-${Math.random()}`,
            likes: 0,
            timestamp: new Date().toISOString()
          };

        case 'word':
          // First fetch a random word
          const wordResponse = await fetch(APIs.WORDS, {
            headers: {
              'X-Api-Key': NINJA_API_KEY
            }
          });
          if (!wordResponse.ok) throw new Error('Words API failed');
          const wordData = await wordResponse.json();
          const word = wordData.word;
          
          // Then fetch its definition
          const definitionResponse = await fetch(`${APIs.DEFINITIONS}${word}`);
          if (!definitionResponse.ok) throw new Error('Definition API failed');
          const definitionData = await definitionResponse.json();
          
          let definition = "No definition available.";
          let partOfSpeech = "";
          let example = "";
          
          if (definitionData[0] && definitionData[0].meanings && definitionData[0].meanings.length > 0) {
            const meaning = definitionData[0].meanings[0];
            partOfSpeech = meaning.partOfSpeech;
            
            if (meaning.definitions && meaning.definitions.length > 0) {
              definition = meaning.definitions[0].definition;
              example = meaning.definitions[0].example || "";
            }
          }
          
          return {
            type: 'word',
            word: word,
            partOfSpeech: partOfSpeech,
            definition: definition,
            example: example,
            id: `word-${Date.now()}-${Math.random()}`,
            likes: 0,
            timestamp: new Date().toISOString()
          };

        case 'trivia':
          // Use the Ninja API for trivia with your provided key
          const triviaResponse = await fetch(APIs.TRIVIA, {
            headers: {
              'X-Api-Key': NINJA_API_KEY
            }
          });
          
          if (!triviaResponse.ok) throw new Error('Trivia API failed');
          const triviaData = await triviaResponse.json();
          
          console.log('Trivia API response:', triviaData);
          
          if (triviaData && triviaData.length > 0) {
            const triviaItem = triviaData[0];
            return {
              type: 'trivia',
              question: triviaItem.question,
              answer: triviaItem.answer,
              id: `trivia-${Date.now()}-${Math.random()}`,
              likes: 0,
              timestamp: new Date().toISOString()
            };
          } else {
            // Fallback to Open Trivia DB if Ninja API returns no results
            const openTriviaResponse = await fetch(APIs.OPEN_TRIVIA);
            if (!openTriviaResponse.ok) throw new Error('Open Trivia API failed');
            const openTriviaData = await openTriviaResponse.json();
            
            if (openTriviaData.results && openTriviaData.results.length > 0) {
              const openTriviaItem = openTriviaData.results[0];
              return {
                type: 'trivia',
                question: openTriviaItem.question,
                answer: openTriviaItem.correct_answer,
                id: `trivia-${Date.now()}-${Math.random()}`,
                likes: 0,
                timestamp: new Date().toISOString()
              };
            } else {
              throw new Error('No trivia data returned from either API');
            }
          }

        case 'meme':
          // Try different strategies to get a unique meme
          
          // Strategy 1: Try a random subreddit with preference for dark humor
          const preferDark = Math.random() < 0.5; // 50% chance to prefer dark humor
          const randomSubreddit = getRandomSubreddit(preferDark);
          console.log(`Trying to fetch meme from r/${randomSubreddit}${preferDark ? ' (dark humor preferred)' : ''}`);
          
          try {
            const memeResponse = await fetch(APIs.MEMES_SUBREDDIT(randomSubreddit));
            if (!memeResponse.ok) throw new Error(`Meme API failed with status ${memeResponse.status}`);
            
            const memeData = await memeResponse.json();
            
            if (memeData && memeData.url && !seenMemeUrls.has(memeData.url)) {
              // Found a unique meme!
              setSeenMemeUrls(prev => new Set([...prev, memeData.url]));
              
              return {
                type: 'meme',
                title: memeData.title || 'Random Meme',
                content: memeData.url,
                subreddit: memeData.subreddit || randomSubreddit,
                author: memeData.author,
                id: `meme-${Date.now()}-${Math.random()}`,
                likes: 0,
                timestamp: new Date().toISOString()
              };
            }
          } catch (error) {
            console.error(`Error fetching from r/${randomSubreddit}:`, error);
          }
          
          // Strategy 2: Try to get multiple memes at once from a dark subreddit
          try {
            // Try to get 5 memes at once from a different random subreddit, preferring dark
            const backupSubreddit = getRandomSubreddit(true); // Always prefer dark for backup
            console.log(`Trying to fetch 5 memes from r/${backupSubreddit} (dark humor preferred)`);
            
            const multipleMemeResponse = await fetch(APIs.MEMES_MULTIPLE(backupSubreddit, 5));
            if (!multipleMemeResponse.ok) throw new Error(`Multiple meme API failed`);
            
            const multipleMemeData = await multipleMemeResponse.json();
            
            if (multipleMemeData && multipleMemeData.memes && multipleMemeData.memes.length > 0) {
              // Look through the memes for a unique one
              for (const meme of multipleMemeData.memes) {
                if (!seenMemeUrls.has(meme.url)) {
                  // Found a unique meme!
                  setSeenMemeUrls(prev => new Set([...prev, meme.url]));
                  
                  return {
                    type: 'meme',
                    title: meme.title || 'Random Meme',
                    content: meme.url,
                    subreddit: meme.subreddit || backupSubreddit,
                    author: meme.author,
                    id: `meme-${Date.now()}-${Math.random()}`,
                    likes: 0,
                    timestamp: new Date().toISOString()
                  };
                }
              }
            }
          } catch (error) {
            console.error('Error fetching multiple memes:', error);
          }
          
          // Strategy 3: Try specific dark humor subreddits one by one
          const darkSubreddits = [
            'darkjokes', 'darkmemers', 'holup', 'cursedcomments', 'offensivejokes'
          ];
          
          for (const darkSub of darkSubreddits) {
            try {
              console.log(`Trying specific dark humor subreddit: r/${darkSub}`);
              const darkMemeResponse = await fetch(APIs.MEMES_SUBREDDIT(darkSub));
              
              if (darkMemeResponse.ok) {
                const darkMemeData = await darkMemeResponse.json();
                
                if (darkMemeData && darkMemeData.url && !seenMemeUrls.has(darkMemeData.url)) {
                  setSeenMemeUrls(prev => new Set([...prev, darkMemeData.url]));
    
    return {
                    type: 'meme',
                    title: darkMemeData.title || 'Dark Meme',
                    content: darkMemeData.url,
                    subreddit: darkMemeData.subreddit || darkSub,
                    author: darkMemeData.author,
                    id: `meme-${Date.now()}-${Math.random()}`,
                    likes: 0,
                    timestamp: new Date().toISOString()
                  };
                }
              }
            } catch (error) {
              console.error(`Error fetching from dark subreddit r/${darkSub}:`, error);
            }
          }
          
          // Strategy 4: Last resort - try the generic endpoint
          try {
            console.log('Trying generic meme endpoint as last resort');
            const genericMemeResponse = await fetch(APIs.MEMES);
            if (!genericMemeResponse.ok) throw new Error('Generic meme API failed');
            
            const genericMemeData = await genericMemeResponse.json();
            
            if (genericMemeData && genericMemeData.url && !seenMemeUrls.has(genericMemeData.url)) {
              // Found a unique meme!
              setSeenMemeUrls(prev => new Set([...prev, genericMemeData.url]));
              
              return {
                type: 'meme',
                title: genericMemeData.title || 'Random Meme',
                content: genericMemeData.url,
                subreddit: genericMemeData.subreddit || 'unknown',
                author: genericMemeData.author,
                id: `meme-${Date.now()}-${Math.random()}`,
                likes: 0,
                timestamp: new Date().toISOString()
              };
            }
          } catch (error) {
            console.error('Error fetching generic meme:', error);
          }
          
          // If we've exhausted all options and have a lot of seen memes, 
          // clear half of the oldest ones to allow for more variety
          if (seenMemeUrls.size > 100) {
            console.log('Clearing half of seen meme URLs to allow more variety');
            const urlArray = Array.from(seenMemeUrls);
            const newSet = new Set(urlArray.slice(urlArray.length / 2));
            setSeenMemeUrls(newSet);
            
            // Try one more time with a dark subreddit
            const lastChanceSub = getRandomSubreddit(true);
            const lastChanceResponse = await fetch(APIs.MEMES_SUBREDDIT(lastChanceSub));
            if (lastChanceResponse.ok) {
              const lastChanceData = await lastChanceResponse.json();
              if (lastChanceData && lastChanceData.url) {
                return {
                  type: 'meme',
                  title: lastChanceData.title || 'Random Meme',
                  content: lastChanceData.url,
                  subreddit: lastChanceData.subreddit || lastChanceSub,
                  author: lastChanceData.author,
                  id: `meme-${Date.now()}-${Math.random()}`,
                  likes: 0,
                  timestamp: new Date().toISOString()
                };
              }
            }
          }
          
          throw new Error('Failed to find a unique meme after multiple strategies');

        default:
          throw new Error('Unknown content type');
      }
    } catch (error) {
      console.error(`Error in fetchRandomContent for ${type}:`, error);
      throw error;
    }
  };

  // Modified loadMoreItems to prevent duplicates
  const loadMoreItems = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      const newItems = [];
      const itemsToCreate = 3;
      let attempts = 0;
      const maxAttempts = 10; // Limit attempts to prevent infinite loops
      
      while (newItems.length < itemsToCreate && attempts < maxAttempts) {
        attempts++;
        
        // Determine which type to fetch based on active category
        let type;
        if (activeCategory === 'all') {
          // Randomly select a category when 'all' is active
          const types = Object.keys(categories).filter(cat => cat !== 'all');
          type = types[Math.floor(Math.random() * types.length)];
        } else {
          type = activeCategory;
        }
        
        try {
          const item = await fetchRandomContent(type);
          
          // Create a unique content identifier
          let contentId;
          if (item.type === 'meme' || item.type === 'image') {
            contentId = item.content; // Use image URL as identifier
          } else if (item.type === 'word') {
            contentId = item.word; // Use the word as identifier
          } else if (item.type === 'trivia') {
            contentId = item.question; // Use question as identifier
          } else {
            contentId = item.content; // Use content text as identifier
          }
          
          // Check if we've seen this content before
          if (!seenContent.has(contentId)) {
            // Add reactions object to the item
            item.reactions = {};
            newItems.push(item);
            
            // Add to seen content set
            setSeenContent(prev => new Set([...prev, contentId]));
          } else {
            console.log('Skipping duplicate content:', contentId);
          }
    } catch (error) {
          console.error(`Error fetching ${type}:`, error);
        }
      }
      
      if (newItems.length > 0) {
        setItems(prevItems => [...prevItems, ...newItems]);
        setPage(prevPage => prevPage + 1);
      }
    } catch (error) {
      console.error('Error loading more items:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, activeCategory, seenContent]);

  // Handle category change
  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setItems([]);
    setPage(1);
  };

  // Handle reaction
  const handleReaction = (id, reactionType) => {
    setItems(prevItems => 
      prevItems.map(item => {
        if (item.id === id) {
          // Initialize reactions object if it doesn't exist
          const reactions = item.reactions || {};
          
          // Toggle the reaction (add if not present, remove if already there)
          const currentCount = reactions[reactionType] || 0;
          const newReactions = {
            ...reactions,
            [reactionType]: currentCount > 0 ? 0 : 1
          };
          
          return { 
            ...item, 
            reactions: newReactions,
            showHeart: reactionType === 'like' && currentCount === 0 ? true : item.showHeart 
          };
        }
        return item;
      })
    );

    // Remove heart animation after animation completes
    if (reactionType === 'like') {
      setTimeout(() => {
        setItems(prevItems => 
          prevItems.map(item => 
            item.id === id ? { ...item, showHeart: false } : item
          )
        );
      }, 1000);
    }
  };

  // Count total reactions for an item
  const getTotalReactions = (reactions) => {
    if (!reactions) return 0;
    return Object.values(reactions).reduce((sum, count) => sum + count, 0);
  };

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '20px',
      threshold: 0.1
    };

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading) {
        loadMoreItems();
      }
    }, options);

    if (loadingTriggerRef.current) {
      observer.current.observe(loadingTriggerRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [loadMoreItems, loading]);

  // Store loadMoreItems in a ref to avoid dependency issues
  const loadMoreItemsRef = useRef(loadMoreItems);
  
  // Update ref when loadMoreItems changes
  useEffect(() => {
    loadMoreItemsRef.current = loadMoreItems;
  }, [loadMoreItems]);

  // Initial load
  useEffect(() => {
    loadMoreItemsRef.current();
  }, []);

  // Load new items when category changes
  useEffect(() => {
    if (page === 1) {
      loadMoreItemsRef.current();
    }
  }, [activeCategory, page]);

  // Render content without titles
  const renderContent = (item) => {
    switch (item.type) {
      case 'meme':
        return (
          <div className="meme-content">
            <h3 className="content-title">Meme • ChaosFeed</h3>
            <div className="meme-image-container">
              <img 
                src={item.content} 
                alt="Meme" 
                className="meme-image" 
                loading="lazy"
                onError={(e) => {
                  // Handle image loading errors
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                }}
              />
            </div>
          </div>
        );
      
      case 'trivia':
        return (
          <div className="trivia-content">
            <p className="trivia-question">{item.question}</p>
            {revealedAnswers[item.id] ? (
              <p className="trivia-answer">{item.answer}</p>
            ) : (
              <button 
                className="reveal-answer-button"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering card click
                  toggleAnswer(item.id);
                }}
              >
                Reveal Answer
              </button>
            )}
          </div>
        );
      
      case 'word':
        return (
          <div className="word-content">
            <h2 className="word-title">{item.word}</h2>
            {item.partOfSpeech && (
              <span className="part-of-speech">{item.partOfSpeech}</span>
            )}
            <div className="definition-bubble">
              <h3>Definition</h3>
              <p>{item.definition}</p>
            </div>
            {item.example && (
              <div className="example-bubble">
                <h3>Example</h3>
                <p>"{item.example}"</p>
              </div>
            )}
          </div>
        );
      
      case 'quote':
        return (
          <p style={{whiteSpace: 'pre-line', fontStyle: 'italic', padding: '16px'}}>
            {item.content}
          </p>
        );
      
      default:
        return <p style={{whiteSpace: 'pre-line', padding: '16px'}}>{item.content}</p>;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Reference for the canvas element
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const appContainerRef = useRef(null);
  
  // Background control state
  const [showControls, setShowControls] = useState(false);
  const [backgroundSettings, setBackgroundSettings] = useState(() => {
    const savedSettings = localStorage.getItem('backgroundSettings');
    return savedSettings ? JSON.parse(savedSettings) : {
      enabled: true,
      particleCount: 100,
      particleSize: 1.5,
      connectionDistance: 150,
      speed: 0.5,
      sensitivity: 0.5,
      shapes: true,
      shapesFrequency: 0.01,
      colorScheme: 'theme', // 'theme', 'custom', 'rainbow'
      customColors: ['#ff00ff', '#00ffff', '#ff3377', '#33ff77', '#7733ff'],
      glow: true,
      glowIntensity: 10,
      opacity: 0.9
    };
  });
  
  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('backgroundSettings', JSON.stringify(backgroundSettings));
  }, [backgroundSettings]);
  
  // Get current neon colors based on settings
  const getNeonColors = useCallback(() => {
    if (backgroundSettings.colorScheme === 'custom') {
      return backgroundSettings.customColors;
    } else if (backgroundSettings.colorScheme === 'rainbow') {
      return ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0000ff', '#8a2be2', '#ff00ff'];
    } else {
      // Theme-based colors
      return darkMode ? 
        ['#ff00ff', '#00ffff', '#ff3377', '#33ff77', '#7733ff'] : 
        ['#ff00aa', '#00aaff', '#aa00ff', '#00ffaa', '#ffaa00'];
    }
  }, [backgroundSettings.colorScheme, backgroundSettings.customColors, darkMode]);
  
  // Handle setting changes
  const handleSettingChange = (setting, value) => {
    setBackgroundSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };
  
  // Add a custom color
  const addCustomColor = (color) => {
    setBackgroundSettings(prev => ({
      ...prev,
      customColors: [...prev.customColors, color]
    }));
  };
  
  // Remove a custom color
  const removeCustomColor = (index) => {
    setBackgroundSettings(prev => ({
      ...prev,
      customColors: prev.customColors.filter((_, i) => i !== index)
    }));
  };
  
  // Reset to defaults
  const resetSettings = () => {
    setBackgroundSettings({
      enabled: true,
      particleCount: 100,
      particleSize: 1.5,
      connectionDistance: 150,
      speed: 0.5,
      sensitivity: 0.5,
      shapes: true,
      shapesFrequency: 0.01,
      colorScheme: 'theme',
      customColors: ['#ff00ff', '#00ffff', '#ff3377', '#33ff77', '#7733ff'],
      glow: true,
      glowIntensity: 10,
      opacity: 0.9
    });
  };
  
  // Initialize and animate the background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !backgroundSettings.enabled) return;
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions to cover the entire document
    const setCanvasDimensions = () => {
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
      
      canvas.width = window.innerWidth;
      canvas.height = docHeight;
      
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.zIndex = '-1';
      canvas.style.opacity = backgroundSettings.opacity;
    };
    
    setCanvasDimensions();
    
    const resizeObserver = new ResizeObserver(() => {
      setCanvasDimensions();
    });
    
    resizeObserver.observe(document.body);
    window.addEventListener('resize', setCanvasDimensions);
    
    // Geometric elements
    const particles = [];
    const particleCount = Math.min(
      Math.floor(window.innerWidth * window.innerHeight / 15000) * backgroundSettings.particleCount / 100,
      backgroundSettings.particleCount * 2
    );
    
    // Create particles
    const createParticles = () => {
      particles.length = 0;
      const neonColors = getNeonColors();
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * (document.documentElement.scrollHeight || 2000),
          size: Math.random() * backgroundSettings.particleSize + 0.5,
          speedX: (Math.random() - 0.5) * backgroundSettings.speed,
          speedY: (Math.random() - 0.5) * backgroundSettings.speed,
          color: neonColors[Math.floor(Math.random() * neonColors.length)],
          connections: []
        });
      }
    };
    
    // Draw geometric patterns
    const drawGeometricPatterns = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Background color based on theme
      const bgColor = darkMode ? 
        `rgba(10, 10, 20, ${backgroundSettings.opacity})` : 
        `rgba(245, 245, 255, ${backgroundSettings.opacity})`;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Get current scroll position
      const scrollY = window.scrollY || window.pageYOffset;
      const viewportHeight = window.innerHeight;
      
      // Update particle positions
      particles.forEach(particle => {
        const particleViewportY = particle.y - scrollY;
        
        if (particleViewportY > -200 && particleViewportY < viewportHeight + 200) {
          particle.x += particle.speedX;
          particle.y += particle.speedY;
          
          // Bounce off edges
          if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
          
          // For Y, wrap around instead of bouncing
          if (particle.y < 0) particle.y = document.documentElement.scrollHeight;
          if (particle.y > document.documentElement.scrollHeight) particle.y = 0;
        }
        
        // Reset connections
        particle.connections = [];
      });
      
      // Find connections between particles
      for (let i = 0; i < particles.length; i++) {
        const particleViewportY1 = particles[i].y - scrollY;
        
        if (particleViewportY1 > -200 && particleViewportY1 < viewportHeight + 200) {
          for (let j = i + 1; j < particles.length; j++) {
            const particleViewportY2 = particles[j].y - scrollY;
            
            if (particleViewportY2 > -200 && particleViewportY2 < viewportHeight + 200) {
              const dx = particles[i].x - particles[j].x;
              const dy = particles[i].y - particles[j].y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance < backgroundSettings.connectionDistance) {
                particles[i].connections.push(j);
                particles[j].connections.push(i);
              }
            }
          }
        }
      }
      
      // Draw connections
      particles.forEach((particle, i) => {
        const particleViewportY = particle.y - scrollY;
        
        if (particleViewportY > -200 && particleViewportY < viewportHeight + 200) {
          particle.connections.forEach(j => {
            const other = particles[j];
            const dx = particle.x - other.x;
            const dy = particle.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Create gradient for neon effect
            const gradient = ctx.createLinearGradient(
              particle.x, particle.y - scrollY, other.x, other.y - scrollY
            );
            gradient.addColorStop(0, particle.color);
            gradient.addColorStop(1, other.color);
            
            ctx.beginPath();
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 0.5 * (1 - distance / backgroundSettings.connectionDistance);
            ctx.globalAlpha = 0.5 * (1 - distance / backgroundSettings.connectionDistance);
            ctx.moveTo(particle.x, particle.y - scrollY);
            ctx.lineTo(other.x, other.y - scrollY);
            ctx.stroke();
            ctx.globalAlpha = 1;
          });
        }
      });
      
      // Draw particles with glow effect
      particles.forEach(particle => {
        const particleViewportY = particle.y - scrollY;
        
        if (particleViewportY > -200 && particleViewportY < viewportHeight + 200) {
          if (backgroundSettings.glow) {
            ctx.beginPath();
            const glow = backgroundSettings.glowIntensity;
            
            // Create radial gradient for glow
            const gradient = ctx.createRadialGradient(
              particle.x, particleViewportY, 0,
              particle.x, particleViewportY, particle.size * glow
            );
            gradient.addColorStop(0, particle.color);
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.arc(particle.x, particleViewportY, particle.size * glow, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Draw particle center
          ctx.beginPath();
          ctx.fillStyle = particle.color;
          ctx.arc(particle.x, particleViewportY, particle.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      
      // Add geometric shapes occasionally
      if (backgroundSettings.shapes && Math.random() < backgroundSettings.shapesFrequency) {
        drawRandomGeometry(ctx, canvas.width, viewportHeight, getNeonColors(), scrollY);
      }
      
      animationRef.current = requestAnimationFrame(drawGeometricPatterns);
    };
    
    // Draw random geometric elements
    const drawRandomGeometry = (ctx, width, height, colors, scrollY) => {
      const type = Math.floor(Math.random() * 4);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 100 + 50;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      
      switch (type) {
        case 0: // Triangle
          ctx.beginPath();
          ctx.moveTo(x, y - size/2);
          ctx.lineTo(x + size/2, y + size/2);
          ctx.lineTo(x - size/2, y + size/2);
          ctx.closePath();
          ctx.stroke();
          break;
        case 1: // Square
          ctx.beginPath();
          ctx.rect(x - size/2, y - size/2, size, size);
          ctx.stroke();
          break;
        case 2: // Circle
          ctx.beginPath();
          ctx.arc(x, y, size/2, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 3: // Hexagon
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = Math.PI * 2 / 6 * i;
            const px = x + Math.cos(angle) * size/2;
            const py = y + Math.sin(angle) * size/2;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          break;
      }
      
      ctx.globalAlpha = 1;
    };
    
    // Add mouse interaction
    const handleMouseMove = (e) => {
      if (!backgroundSettings.enabled) return;
      
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      // Find closest particles and adjust their speed
      particles.forEach(particle => {
        const particleViewportY = particle.y - window.scrollY;
        
        if (particleViewportY > -200 && particleViewportY < window.innerHeight + 200) {
          const dx = mouseX - particle.x;
          const dy = mouseY - particleViewportY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            const angle = Math.atan2(dy, dx);
            const force = (100 - distance) / 500 * backgroundSettings.sensitivity;
            particle.speedX -= Math.cos(angle) * force;
            particle.speedY -= Math.sin(angle) * force;
          }
        }
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    // Initialize and start animation
    createParticles();
    drawGeometricPatterns();
    
    // Clean up
    return () => {
      window.removeEventListener('resize', setCanvasDimensions);
      window.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationRef.current);
    };
  }, [
    darkMode, 
    backgroundSettings.enabled,
    backgroundSettings.particleCount,
    backgroundSettings.particleSize,
    backgroundSettings.connectionDistance,
    backgroundSettings.speed,
    backgroundSettings.sensitivity,
    backgroundSettings.shapes,
    backgroundSettings.shapesFrequency,
    backgroundSettings.glow,
    backgroundSettings.glowIntensity,
    backgroundSettings.opacity,
    getNeonColors
  ]);
  
  // Render the background controls panel
  const renderBackgroundControls = () => {
    if (!showControls) return null;

  return (
      <div className="background-controls-panel">
        <div className="controls-header">
          <h3>Background Settings</h3>
            <button 
            className="close-controls" 
            onClick={() => setShowControls(false)}
            aria-label="Close controls"
          >
            ×
          </button>
        </div>
        
        <div className="controls-section">
          <div className="control-group">
            <label className="control-label">
              <input 
                type="checkbox" 
                checked={backgroundSettings.enabled} 
                onChange={(e) => handleSettingChange('enabled', e.target.checked)}
              />
              Enable Background
            </label>
          </div>
          
          <div className="control-group">
            <label className="control-label">Particles: {backgroundSettings.particleCount}</label>
            <input 
              type="range" 
              min="10" 
              max="300" 
              value={backgroundSettings.particleCount} 
              onChange={(e) => handleSettingChange('particleCount', parseInt(e.target.value))}
              className="slider"
            />
          </div>
          
          <div className="control-group">
            <label className="control-label">Size: {backgroundSettings.particleSize.toFixed(1)}</label>
            <input 
              type="range" 
              min="0.5" 
              max="5" 
              step="0.1" 
              value={backgroundSettings.particleSize} 
              onChange={(e) => handleSettingChange('particleSize', parseFloat(e.target.value))}
              className="slider"
            />
          </div>
          
          <div className="control-group">
            <label className="control-label">Connection Distance: {backgroundSettings.connectionDistance}</label>
            <input 
              type="range" 
              min="50" 
              max="300" 
              value={backgroundSettings.connectionDistance} 
              onChange={(e) => handleSettingChange('connectionDistance', parseInt(e.target.value))}
              className="slider"
            />
          </div>
          
          <div className="control-group">
            <label className="control-label">Speed: {backgroundSettings.speed.toFixed(1)}</label>
            <input 
              type="range" 
              min="0.1" 
              max="2" 
              step="0.1" 
              value={backgroundSettings.speed} 
              onChange={(e) => handleSettingChange('speed', parseFloat(e.target.value))}
              className="slider"
            />
          </div>
          
          <div className="control-group">
            <label className="control-label">Mouse Sensitivity: {backgroundSettings.sensitivity.toFixed(1)}</label>
            <input 
              type="range" 
              min="0" 
              max="2" 
              step="0.1" 
              value={backgroundSettings.sensitivity} 
              onChange={(e) => handleSettingChange('sensitivity', parseFloat(e.target.value))}
              className="slider"
            />
          </div>
          
          <div className="control-group">
            <label className="control-label">Background Opacity: {backgroundSettings.opacity.toFixed(1)}</label>
            <input 
              type="range" 
              min="0.1" 
              max="1" 
              step="0.1" 
              value={backgroundSettings.opacity} 
              onChange={(e) => handleSettingChange('opacity', parseFloat(e.target.value))}
              className="slider"
            />
          </div>
        </div>
        
        <div className="controls-section">
          <div className="control-group">
            <label className="control-label">
              <input 
                type="checkbox" 
                checked={backgroundSettings.shapes} 
                onChange={(e) => handleSettingChange('shapes', e.target.checked)}
              />
              Show Geometric Shapes
            </label>
          </div>
          
          {backgroundSettings.shapes && (
            <div className="control-group">
              <label className="control-label">Shape Frequency: {backgroundSettings.shapesFrequency.toFixed(3)}</label>
              <input 
                type="range" 
                min="0.001" 
                max="0.05" 
                step="0.001" 
                value={backgroundSettings.shapesFrequency} 
                onChange={(e) => handleSettingChange('shapesFrequency', parseFloat(e.target.value))}
                className="slider"
              />
            </div>
          )}
          
          <div className="control-group">
            <label className="control-label">
              <input 
                type="checkbox" 
                checked={backgroundSettings.glow} 
                onChange={(e) => handleSettingChange('glow', e.target.checked)}
              />
              Enable Glow Effect
            </label>
          </div>
          
          {backgroundSettings.glow && (
            <div className="control-group">
              <label className="control-label">Glow Intensity: {backgroundSettings.glowIntensity}</label>
              <input 
                type="range" 
                min="1" 
                max="20" 
                value={backgroundSettings.glowIntensity} 
                onChange={(e) => handleSettingChange('glowIntensity', parseInt(e.target.value))}
                className="slider"
              />
            </div>
          )}
        </div>
        
        <div className="controls-section">
          <div className="control-group">
            <label className="control-label">Color Scheme</label>
            <div className="radio-group">
              <label>
                <input 
                  type="radio" 
                  name="colorScheme" 
                  value="theme" 
                  checked={backgroundSettings.colorScheme === 'theme'} 
                  onChange={() => handleSettingChange('colorScheme', 'theme')}
                />
                Match Theme
              </label>
              <label>
                <input 
                  type="radio" 
                  name="colorScheme" 
                  value="rainbow" 
                  checked={backgroundSettings.colorScheme === 'rainbow'} 
                  onChange={() => handleSettingChange('colorScheme', 'rainbow')}
                />
                Rainbow
              </label>
              <label>
                <input 
                  type="radio" 
                  name="colorScheme" 
                  value="custom" 
                  checked={backgroundSettings.colorScheme === 'custom'} 
                  onChange={() => handleSettingChange('colorScheme', 'custom')}
                />
                Custom
              </label>
            </div>
          </div>
          
          {backgroundSettings.colorScheme === 'custom' && (
            <div className="custom-colors">
              <div className="color-swatches">
                {backgroundSettings.customColors.map((color, index) => (
                  <div key={index} className="color-swatch-container">
                    <div 
                      className="color-swatch" 
                      style={{ backgroundColor: color }}
                      title={color}
                    ></div>
                    <button 
                      className="remove-color" 
                      onClick={() => removeCustomColor(index)}
                      aria-label={`Remove color ${color}`}
                    >
                      ×
            </button>
                  </div>
                ))}
              </div>
              
              <div className="add-color">
                <input 
                  type="color" 
                  id="new-color" 
                  defaultValue="#00aaff"
                />
                <button 
                  onClick={() => addCustomColor(document.getElementById('new-color').value)}
                  aria-label="Add color"
                >
                  Add Color
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="controls-footer">
          <button 
            className="reset-button" 
            onClick={resetSettings}
            aria-label="Reset to defaults"
          >
            ↺ Reset to Defaults
          </button>
        </div>
      </div>
    );
  };
  
  // Add this function to your component
  const handleImageLoad = (e) => {
    const img = e.target;
    
    // If image is extremely tall and narrow, limit its height
    if (img.naturalHeight > img.naturalWidth * 2) {
      img.style.maxHeight = '400px';
    }
    
    // If image is extremely wide and short, ensure it fits width
    if (img.naturalWidth > img.naturalHeight * 2) {
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
    }
  };
  
  return (
    <div className="app-container" ref={appContainerRef}>
      {/* Interactive background canvas */}
      {backgroundSettings.enabled && <canvas ref={canvasRef} className="background-canvas"></canvas>}
      
      {/* Background controls toggle button */}
      <button 
        className="background-controls-toggle" 
        onClick={() => setShowControls(!showControls)}
        aria-label="Toggle background controls"
        title="Background Settings"
      >
        ⚙️
      </button>
      
      {/* Background controls panel */}
      {renderBackgroundControls()}
      
      <div className="chaos-scroll-container" style={{
        '--bgPrimary': currentTheme.bgPrimary,
        '--bgSecondary': currentTheme.bgSecondary,
        '--textPrimary': currentTheme.textPrimary,
        '--textSecondary': currentTheme.textSecondary,
        '--borderColor': currentTheme.borderColor,
        '--cardShadow': currentTheme.cardShadow,
        '--buttonBg': currentTheme.buttonBg,
        '--buttonShadow': currentTheme.buttonShadow,
        '--reactionBg': currentTheme.reactionBg
      }}>
        {/* Header with toggle button and category filter */}
        <div className="app-header">
          {/* Convenient toggle button position */}
          <button 
            className="dark-mode-toggle" 
            onClick={toggleDarkMode}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          
          {/* Category filter bar */}
          <div className="category-filter" ref={categoryFilterRef}>
            {Object.entries(categories)
              .filter(([key]) => key !== 'image')
              .map(([key, { name, color }]) => (
                <button 
                  key={key}
                  className={`category-button ${activeCategory === key ? 'active' : ''}`}
                  data-category={key}
                  style={{ 
                    '--category-color': color
                  }}
                  onClick={() => handleCategoryChange(key)}
                >
                  {name}
                </button>
              ))}
          </div>
        </div>

        <div className="text-display">
          {items.map((item) => (
            <div 
              key={item.id} 
              className={`chaos-item ${item.type}`}
              onDoubleClick={() => handleReaction(item.id, 'like')}
              style={{
                '--item-color': currentTheme.categories[item.type] || currentTheme.categories.all
              }}
            >
              {item.showHeart && <div className="heart-animation">❤️</div>}
              {renderContent(item)}
              <div className="item-footer">
                <div className="action-buttons">
                  {Object.entries(reactions).map(([type, { emoji, label }]) => (
                    <button 
                      key={type}
                      className={`action-button ${item.reactions && item.reactions[type] ? 'active' : ''}`}
                      onClick={() => handleReaction(item.id, type)}
                      aria-label={label}
                      title={label}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {getTotalReactions(item.reactions) > 0 && (
                  <div className="reactions-summary">
                    {Object.entries(item.reactions || {}).map(([type, count]) => 
                      count > 0 ? (
                        <span key={type} className="reaction-count" title={reactions[type].label}>
                          {reactions[type].emoji} {count}
                        </span>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div ref={loadingTriggerRef} className="loading-trigger">
          {loading ? 'Loading more content...' : 'Scroll for more'}        </div>
        
        {/* Add a spacer at the bottom to ensure content has some padding */}
        <div style={{ height: '20px' }}></div>
      </div>
    </div>
  );
};

export default ChaosScroll; 

