
import React, { useState, useEffect, useRef } from 'react';
import '../styles/ChaosScroll.css';
import APIS from '../config/apis';

const ChaosScroll = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [usedContent, setUsedContent] = useState(new Set());
  const observer = useRef(null);
  const loadingRef = useRef(null);

  const CONTENT_TYPES = [
    { id: 'all', label: 'All', emoji: '🌈' },
    { id: 'fact', label: 'Facts', emoji: '💡' },
    { id: 'joke', label: 'Jokes', emoji: '😂' },
    { id: 'word', label: 'Words', emoji: '📚' },
    { id: 'trivia', label: 'Trivia', emoji: '🎯' },
    { id: 'meme', label: 'Memes', emoji: '🎭' }
  ];

  const REACTIONS = [
    { text: 'Like', label: 'Like', emoji: '👍' },
    { text: 'Dislike', label: 'Dislike', emoji: '👎' },
    { text: 'Laugh', label: 'Laugh', emoji: '😂' },
    { text: 'Wow', label: 'Wow', emoji: '😮' },
    { text: 'Hmm', label: 'Hmm', emoji: '🤔' },
    { text: 'Save', label: 'Save', emoji: '🔖' }
  ];
  const getRandomContentType = () => {
    const contentTypes = ['fact', 'joke', 'word', 'trivia', 'meme'];
    return contentTypes[Math.floor(Math.random() * contentTypes.length)];
  };
  // Improved fetchRandomContent with better error handling and performance
  const fetchRandomContent = async (forceType = null) => {
    const type = forceType || getRandomContentType();
    console.log('Fetching content of type:', type);
    
    try {
      switch (type) {
        case 'fact': {
          const factRes = await fetch(APIS.FACTS, {
            headers: { 'X-Api-Key': process.env.REACT_APP_NINJA_API_KEY }
          });
          const factData = await factRes.json();
          const factText = factData[0]?.fact;
          
          if (!factText || usedContent.has(`fact:${factText}`)) {
            return fetchRandomContent(); // Try a different type
          }
          
          setUsedContent(prev => new Set([...prev, `fact:${factText}`]));
          return { 
            type, 
            content: factText,
            reactions: {}
          };
        }
        case 'joke': {
          const jokeRes = await fetch(APIS.JOKES);
          const jokeData = await jokeRes.json();
          const jokeText = jokeData.type === 'single' ? jokeData.joke : `${jokeData.setup}\n${jokeData.delivery}`;
          
          if (!jokeText || usedContent.has(`joke:${jokeText}`)) {
            return fetchRandomContent();
          }
          
          setUsedContent(prev => new Set([...prev, `joke:${jokeText}`]));
          return {
            type,
            content: jokeText,
            reactions: {}
          };
        }
        case 'word': {
          try {
            console.log('Fetching word content...');
            const wordContent = await generateRandomWord();
            if (!wordContent || !wordContent.content || !wordContent.content.word) {
              console.error('Invalid word data returned');
              return fetchRandomContent(); // Try a different content type
            }
            console.log('Word content fetched successfully:', wordContent);
            return {
              type: 'word',
              content: wordContent.content,
              reactions: {}
            };
          } catch (error) {
            console.error('Error in word case:', error);
            return fetchRandomContent(); // Try a different content type
          }
        }
        case 'trivia': {
          try {
            const triviaRes = await fetch(APIS.TRIVIA);
            const triviaData = await triviaRes.json();
            
            if (!triviaData || !triviaData.results || triviaData.results.length === 0) {
              console.error('Invalid trivia data format:', triviaData);
              return fetchRandomContent(); // Try a different content type
            }
            
            const question = triviaData.results[0]?.question;
            const correctAnswer = triviaData.results[0]?.correct_answer;
            const incorrectAnswers = triviaData.results[0]?.incorrect_answers || [];
            const category = triviaData.results[0]?.category || 'Pop Culture';
            
            if (!question || !correctAnswer) {
              console.error('Missing question or answer in trivia data');
              return fetchRandomContent();
            }
            
            // Decode base64 content
            const decodeBase64 = (base64) => {
              try {
                return atob(base64);
              } catch (e) {
                console.error('Error decoding base64:', e);
                return base64;
              }
            };
            
            const decodedQuestion = decodeBase64(question);
            const decodedAnswer = decodeBase64(correctAnswer);
            const decodedCategory = decodeBase64(category);
            
            // Create a unique identifier for this trivia
            const triviaId = `${decodedQuestion}-${decodedAnswer}`;
            
            if (usedContent.has(`trivia:${triviaId}`)) {
              return fetchRandomContent();
            }
            
            setUsedContent(prev => new Set([...prev, `trivia:${triviaId}`]));
            
            return {
              type,
              content: {
                question: decodedQuestion,
                answer: decodedAnswer,
                category: decodedCategory
              },
              reactions: {}
            };
          } catch (error) {
            console.error('Error fetching trivia:', error);
            return fetchRandomContent(); // Try a different content type
          }
        }
        case 'meme': {
          try {
            const memeRes = await fetch(APIS.MEMES);
            const memeData = await memeRes.json();
            
            if (!memeData || !memeData.url) {
              console.error('Invalid meme data format:', memeData);
              return fetchRandomContent(); // Try a different content type
            }
            
            const memeUrl = memeData.url;
            const memeTitle = memeData.title || 'Random Meme';
            
            // Create a unique identifier for this meme
            if (usedContent.has(`meme:${memeUrl}`)) {
              return fetchRandomContent();
            }
            
            setUsedContent(prev => new Set([...prev, `meme:${memeUrl}`]));
            
            return {
              type,
              content: {
                url: memeUrl,
                alt: memeTitle,
                caption: memeTitle
              },
              reactions: {}
            };
          } catch (error) {
            console.error('Error fetching meme:', error);
            return fetchRandomContent(); // Try a different content type
          }
        }
          
        default:
          return (
            <p>
              {typeof item.content === 'object' ? JSON.stringify(item.content) : item.content}
            </p>
          );
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      return fetchRandomContent(); // Try again with a different type
    }
  };
  const generateRandomWord = async () => {
    try {
      // First get a random word
      const wordRes = await fetch(APIS.WORDS, {
        headers: { 'X-Api-Key': process.env.REACT_APP_NINJA_API_KEY }
      });
      const wordData = await wordRes.json();
      
      if (!wordData || !wordData.word) {
        throw new Error('No word returned');
      }
      
      const randomWord = wordData.word;
      
      // Check if this word has been used
      if (usedContent.has(`word:${randomWord}`)) {
        return generateRandomWord(); // Try again
      }
      
      // Get definition for the word
      const defRes = await fetch(`${APIS.DEFINITIONS}${randomWord}`);
      const defData = await defRes.json();
      
      let definitions = [];
      
      // Only proceed if we have valid definitions
      if (!defData || !defData[0] || !defData[0].meanings) {
        console.log('No definition found for word:', randomWord);
        return generateRandomWord(); // Try another word if no definition found
      }
      
      // Get all meanings and their definitions
      definitions = defData[0].meanings.map(meaning => ({
        partOfSpeech: meaning.partOfSpeech,
        definition: meaning.definitions[0].definition,
        example: meaning.definitions[0].example || null
      }));
      
      // Mark this word as used
      setUsedContent(prev => new Set([...prev, `word:${randomWord}`]));
      
      return {
        type: 'word',
        content: {
          word: randomWord,
          definitions: definitions
        },
        reactions: {}
      };
    } catch (error) {
      console.error('Error generating random word:', error);
      return fetchRandomContent(); // Try a different content type
    }
  };
  const handleFilterChange = (filterType) => {
    // Don't do anything if already on this filter
    if (activeFilter === filterType) return;
    
    // Update the active filter immediately
    setActiveFilter(filterType);
    
    // Clear existing items and show loading state
    setItems([]);
    setLoading(true);
    
    // Use setTimeout with 0ms to push loadMoreItems to the next event cycle
    // This allows the UI to update before starting the data loading
    setTimeout(() => {
      loadMoreItems();
    }, 0);
  };

  // Optimized loadMoreItems function with parallel loading for better performance
  const loadMoreItems = async () => {
    if (loading) return;
    console.log('Loading more items...');
    setLoading(true);
    try {
      const newItems = [];
      const maxAttempts = 50; // Reduced maximum attempts for faster loading
      const itemsToLoad = 5;
      
      // Create an array of promises to load content in parallel
      const contentPromises = [];
      
      // Force specific content type based on filter
      let forceType = activeFilter !== 'all' ? activeFilter : null;
      
      // Create multiple promises to fetch content in parallel
      for (let i = 0; i < itemsToLoad * 3; i++) { // Triple the attempts for better success rate with quotes and memes
        contentPromises.push(
          fetchRandomContent(forceType)
            .catch(error => {
              console.error(`Error in content promise ${i}:`, error);
              return null; // Return null for failed attempts
            })
        );
      }
      
      // Wait for all promises to resolve
      const results = await Promise.all(contentPromises);
      
      // Filter out null results and only keep items of the correct type
      const validResults = results.filter(content => 
        content !== null && (activeFilter === 'all' || content.type === activeFilter)
      );
      
      // Ensure we have unique content (no duplicate memes or quotes)
      const uniqueResults = [];
      const seenUrls = new Set();
      
      for (const result of validResults) {
        // For memes, check URL
        if (result.type === 'meme' && result.content && result.content.url) {
          if (!seenUrls.has(result.content.url)) {
            seenUrls.add(result.content.url);
            uniqueResults.push(result);
          }
        } 
        // For other content types
        else {
          uniqueResults.push(result);
        }
        
        // Break if we have enough items
        if (uniqueResults.length >= itemsToLoad) break;
      }
      
      // Take only the number of items we need
      const selectedResults = uniqueResults.slice(0, itemsToLoad);
      
      // Format the items
      const formattedItems = selectedResults.map(content => ({
        ...content,
        id: Date.now() + Math.random(),
        reactions: {}
      }));
      
      setItems(prev => [...prev, ...formattedItems]);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };
  // Enhanced intersection observer for more responsive infinite scrolling
  useEffect(() => {
    loadMoreItems(); // Load initial items
    
    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          loadMoreItems();
        }
      },
      { threshold: 0.5 } // Lower threshold for earlier loading trigger
    );

    if (loadingRef.current) {
      observer.current.observe(loadingRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [loading, activeFilter]); // Add activeFilter as a dependency
  
  // Handle reactions
  const handleReaction = (itemId, reaction) => {
    setItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId) {
          const currentCount = item.reactions[reaction] || 0;
          return {
            ...item,
            reactions: {
              ...item.reactions,
              [reaction]: currentCount + 1
            }
          };
        }
        return item;
      })
    );
  };
  const renderContent = (item) => {
    switch (item.type) {
      case 'word':
        return (
          <div className="word-content">
            <h3 className="word-title">{item.content.word}</h3>
            <div className="definitions-list">
              {item.content.definitions.map((def, index) => (
                <div key={index} className="definition-item">
                  {def.partOfSpeech && def.partOfSpeech !== 'unknown' && (
                    <span className="part-of-speech">{def.partOfSpeech}</span>
                  )}
                  <p className="definition">{def.definition}</p>
                  {def.example && (
                    <p className="example"><em>Example:</em> {def.example}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      case 'fact':
        return (
          <div className="fact-content">
            <h3 className="fact-title">Did You Know?</h3>
            <p className="fact-text">{item.content}</p>
          </div>
        );
      case 'joke':
        return (
          <div className="joke-content">
            <p className="joke-text">{item.content}</p>
          </div>
        );
      case 'trivia':
        return (
          <div className="trivia-item" onClick={() => {
            const element = document.querySelector(`[data-trivia-id="${item.id}"]`);
            if (element) {
              element.classList.toggle('show-answer');
            }
          }}>
            <div className="trivia-category">{item.content.category}</div>
            <p className="trivia-question">{item.content.question}</p>
            <p className="trivia-answer" data-trivia-id={item.id}>{item.content.answer}</p>
          </div>
        );

      case 'meme':
        return (
          <div className="meme-item">
            <div className="meme-container">
              <img src={item.content.url} alt={item.content.alt} />
            </div>
          </div>
        );
        
      default:
        return (
          <p>
            {typeof item.content === 'object' ? JSON.stringify(item.content) : item.content}
          </p>
        );
    }
  };
  // Render reaction buttons
  const renderReactionButtons = (item) => {
    return (
      <div className="reaction-buttons">
        {REACTIONS.map(reaction => (
          <button 
            key={reaction.text} 
            onClick={() => handleReaction(item.id, reaction.text)}
            className="reaction-button"
            title={reaction.label}
          >
            <span className="reaction-emoji">{reaction.emoji}</span>
            {item.reactions[reaction.text] ? 
              <span className="reaction-count">{item.reactions[reaction.text]}</span> : null}
          </button>
        ))}
      </div>
    );
  };
  // Generate random number for loading messages
  const getRandomLoadingMessage = () => {
    const messages = [
      `Loading ${Math.floor(Math.random() * 999) + 1} pieces of chaos...`,
      "Summoning digital entropy...",
      "Randomizing reality...",
      "Generating algorithmic surrealism...",
      "Unleashing controlled chaos...",
      "Harvesting internet oddities..."
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };
  return (
    <div className="chaos-scroll-container">
      <div className="filter-bar">
        {CONTENT_TYPES.map(type => (
          <button
            key={type.id}
            onClick={() => handleFilterChange(type.id)}
            className={`filter-button ${activeFilter === type.id ? 'active' : ''}`}
            data-type={type.id}
          >
            <span className="filter-emoji">{type.emoji}</span>
            <span className="filter-label">{type.label}</span>
          </button>
        ))}
      </div>
      <div className="text-display">
        {items.map(item => (
          <div key={item.id} className={`chaos-item ${item.type}`} data-type={item.type}>
            <div className="chaos-content">
              {renderContent(item)}
            </div>
            {renderReactionButtons(item)}
          </div>
        ))}
      </div>
      <div 
        ref={loadingRef}
        className="loading-trigger"
      >
        {loading ? 
          getRandomLoadingMessage() : 
          `Scroll for ${Math.floor(Math.random() * 999) + 1} more chaos...`}
      </div>
    </div>
  );
};

export default ChaosScroll;