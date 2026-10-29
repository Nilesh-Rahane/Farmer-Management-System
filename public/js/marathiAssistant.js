/**
 * Farm Ledger - Marathi AI Farmer Assistant Controller
 * Features:
 * - Text & Voice Query Input in Marathi
 * - Marathi Text & Speech Synthesis (TTS)
 * - Live Database Insights for Crop Expenses, Worker Wages, Income & Budget
 * - Offline Rule-Based Engine (No External API Keys)
 * - Farmer-Wise Data Security & Responsive Floating Interface
 */

const MarathiAssistant = (() => {
  // State
  let isOpen = false;
  let isListening = false;
  let isSpeaking = false;
  let isMuted = localStorage.getItem('farm_assistant_muted') === 'true';
  let recognition = null;
  let availableVoice = null;
  let chatHistory = [];

  // DOM Elements cache
  let dom = {};

  const init = () => {
    cacheDom();
    if (!dom.fab || !dom.window) return;

    setupSpeechRecognition();
    setupSpeechSynthesis();
    bindEvents();
    loadInitialGreeting();
  };

  const cacheDom = () => {
    dom = {
      fab: document.getElementById('marathi-assistant-fab'),
      window: document.getElementById('marathi-assistant-window'),
      closeBtn: document.getElementById('btn-assistant-close'),
      muteBtn: document.getElementById('btn-assistant-mute-toggle'),
      clearBtn: document.getElementById('btn-assistant-clear'),
      body: document.getElementById('assistant-chat-body'),
      form: document.getElementById('assistant-input-form'),
      input: document.getElementById('assistant-text-input'),
      micBtn: document.getElementById('btn-assistant-mic'),
      sendBtn: document.getElementById('btn-assistant-send'),
      quickChips: document.getElementById('assistant-quick-chips'),
      listeningBanner: document.getElementById('assistant-listening-banner'),
      statusText: document.getElementById('assistant-status-text'),
    };
  };

  // ========================================================
  // 1. SPEECH RECOGNITION (Voice to Text in Marathi)
  // ========================================================
  const setupSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API is not supported in this browser.');
      if (dom.micBtn) {
        dom.micBtn.title = 'या ब्राउझरमध्ये व्हॉइस इनपुट समर्थित नाही (कृपया टाइप करा)';
        dom.micBtn.style.opacity = '0.6';
      }
      return;
    }

    try {
      recognition = new SpeechRecognition();
      recognition.lang = 'mr-IN'; // Marathi (India)
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListening = true;
        updateListeningUI(true);
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (dom.input && currentText) {
          dom.input.value = currentText.trim();
        }

        // If final transcript captured, auto-submit after a brief pause
        if (finalTranscript && finalTranscript.trim().length > 0) {
          stopListening();
          setTimeout(() => {
            handleSubmit(finalTranscript.trim());
          }, 350);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        stopListening();
        if (event.error === 'not-allowed') {
          showBotMessage('⚠️ माइक वापरण्याची परवानगी नाकारली गेली आहे. कृपया ब्राउझरमध्ये मायक्रोफोनची परवानगी द्या किंवा प्रश्न टाईप करा.');
        } else if (event.error !== 'no-speech') {
          showBotMessage('⚠️ आवाज ओळखण्यात अडचण आली. कृपया पुन्हा बोला किंवा टाईप करा.');
        }
      };

      recognition.onend = () => {
        stopListening();
      };
    } catch (err) {
      console.error('Failed to initialize SpeechRecognition:', err);
    }
  };

  const startListening = () => {
    if (!recognition) {
      if (window.App && App.showToast) {
        App.showToast('आपल्या ब्राउझरमध्ये व्हॉइस इनपुट समर्थित नाही. कृपया प्रश्न टाईप करा.', 'warning');
      }
      return;
    }

    // Stop ongoing speech synthesis if any
    stopSpeaking();

    try {
      if (dom.input) dom.input.value = '';
      recognition.start();
    } catch (e) {
      console.warn('Recognition start caught error:', e);
      stopListening();
    }
  };

  const stopListening = () => {
    isListening = false;
    updateListeningUI(false);
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {}
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const updateListeningUI = (listening) => {
    if (dom.micBtn) {
      dom.micBtn.classList.toggle('is-listening', listening);
      dom.micBtn.innerHTML = listening ? '<i class="fas fa-stop"></i>' : '<i class="fas fa-microphone"></i>';
      dom.micBtn.title = listening ? 'ऐकणे थांबवा' : 'माइक दाबून मराठीत बोला';
    }

    if (dom.listeningBanner) {
      dom.listeningBanner.style.display = listening ? 'flex' : 'none';
    }

    if (dom.statusText) {
      dom.statusText.textContent = listening ? '🎙️ ऐकत आहे... बोला' : 'ऑनलाइन';
    }
  };

  // ========================================================
  // 2. TEXT-TO-SPEECH SYNTHESIS (Marathi Voice Replies)
  // ========================================================
  const setupSpeechSynthesis = () => {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis is not supported in this browser.');
      return;
    }

    const selectVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      // 1. First priority: Exact Marathi Voice (mr-IN or mr)
      availableVoice = voices.find(
        (v) => v.lang === 'mr-IN' || v.lang === 'mr_IN' || v.lang.startsWith('mr')
      );

      // 2. Second priority: Hindi Voice (hi-IN) - shares Devanagari phonology and speaks Marathi very naturally
      if (!availableVoice) {
        availableVoice = voices.find(
          (v) => v.lang === 'hi-IN' || v.lang === 'hi_IN' || v.lang.startsWith('hi')
        );
      }

      // 3. Third priority: Indian English (en-IN)
      if (!availableVoice) {
        availableVoice = voices.find((v) => v.lang === 'en-IN' || v.lang === 'en_IN');
      }

      // 4. Fallback default
      if (!availableVoice) {
        availableVoice = voices[0];
      }
    };

    selectVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = selectVoice;
    }

    updateMuteUI();
  };

  const speak = (rawText, onEndCallback) => {
    if (isMuted || !('speechSynthesis' in window)) {
      if (onEndCallback) onEndCallback();
      return;
    }

    stopSpeaking();

    // Clean text for natural speech (remove markdown asterisks, emojis, bullet symbols)
    const cleanSpeech = cleanTextForSpeech(rawText);
    if (!cleanSpeech) {
      if (onEndCallback) onEndCallback();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(cleanSpeech);
      utterance.lang = availableVoice?.lang || 'mr-IN';
      if (availableVoice) utterance.voice = availableVoice;
      utterance.rate = 0.95; // Slightly measured pace for clear agricultural figures
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        isSpeaking = true;
        if (dom.statusText) dom.statusText.textContent = '🔊 बोलत आहे...';
      };

      utterance.onend = () => {
        isSpeaking = false;
        if (dom.statusText) dom.statusText.textContent = 'ऑनलाइन';
        if (onEndCallback) onEndCallback();
      };

      utterance.onerror = (err) => {
        console.warn('SpeechSynthesis error:', err);
        isSpeaking = false;
        if (dom.statusText) dom.statusText.textContent = 'ऑनलाइन';
        if (onEndCallback) onEndCallback();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speak error:', e);
      isSpeaking = false;
      if (onEndCallback) onEndCallback();
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
      if (dom.statusText && !isListening) {
        dom.statusText.textContent = 'ऑनलाइन';
      }
    }
  };

  const toggleMute = () => {
    isMuted = !isMuted;
    localStorage.setItem('farm_assistant_muted', isMuted);
    if (isMuted) stopSpeaking();
    updateMuteUI();

    if (window.App && App.showToast) {
      App.showToast(isMuted ? 'व्हॉइस आवाज बंद केला (Muted)' : 'व्हॉइस आवाज सुरू केला (Unmuted)', 'info', 2000);
    }
  };

  const updateMuteUI = () => {
    if (dom.muteBtn) {
      dom.muteBtn.classList.toggle('is-muted', isMuted);
      dom.muteBtn.innerHTML = isMuted
        ? '<i class="fas fa-volume-xmark"></i>'
        : '<i class="fas fa-volume-high"></i>';
      dom.muteBtn.title = isMuted ? 'आवाज सुरू करा (Unmute)' : 'आवाज बंद करा (Mute)';
    }
  };

  const cleanTextForSpeech = (text) => {
    if (!text) return '';
    return text
      .replace(/[*#_~`]/g, '') // remove markdown symbols
      .replace(/[🌱🌾💰👷📊💡📌✅⚠️•↳━]/g, ' ') // remove emojis/bullet lines
      .replace(/\s+/g, ' ')
      .trim();
  };

  // ========================================================
  // 3. UI RENDERING & CHAT FLOW
  // ========================================================
  const bindEvents = () => {
    // Open/Close
    if (dom.fab) {
      dom.fab.addEventListener('click', toggleAssistant);
    }
    if (dom.closeBtn) {
      dom.closeBtn.addEventListener('click', closeAssistant);
    }

    // Audio controls
    if (dom.muteBtn) {
      dom.muteBtn.addEventListener('click', toggleMute);
    }
    if (dom.clearBtn) {
      dom.clearBtn.addEventListener('click', clearChat);
    }

    // Mic Button
    if (dom.micBtn) {
      dom.micBtn.addEventListener('click', toggleListening);
    }

    // Form submit
    if (dom.form) {
      dom.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = dom.input ? dom.input.value.trim() : '';
        if (query) {
          handleSubmit(query);
        }
      });
    }

    // Quick Chips delegation
    if (dom.quickChips) {
      dom.quickChips.addEventListener('click', (e) => {
        const btn = e.target.closest('.quick-chip-btn');
        if (btn) {
          const query = btn.dataset.query || btn.textContent.trim();
          handleSubmit(query);
        }
      });
    }

    // Global keyboard shortcut: Escape to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeAssistant();
      }
    });

    // Check user auth state and update visibility
    syncUserRole();
    window.addEventListener('auth:expired', syncUserRole);
  };

  const syncUserRole = () => {
    const user = API.getUser();
    const isFarmer = API.isAuthenticated() && user && user.role === 'farmer';
    if (dom.fab) {
      dom.fab.style.display = isFarmer && !isOpen ? 'flex' : 'none';
    }
    if (!isFarmer && isOpen) {
      closeAssistant();
    }
  };

  const toggleAssistant = () => {
    if (isOpen) {
      closeAssistant();
    } else {
      openAssistant();
    }
  };

  const openAssistant = () => {
    const user = API.getUser();
    if (!API.isAuthenticated() || !user || user.role !== 'farmer') {
      return;
    }
    isOpen = true;
    if (dom.window) dom.window.classList.remove('minimized');
    if (dom.fab) dom.fab.style.display = 'none';
    if (dom.input) dom.input.focus();
    scrollToBottom();
  };

  const closeAssistant = () => {
    isOpen = false;
    stopListening();
    stopSpeaking();
    if (dom.window) dom.window.classList.add('minimized');
    syncUserRole();
  };

  const showUserMessage = (text) => {
    const time = new Date().toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' });
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg user';
    msgEl.innerHTML = `
      <div class="msg-bubble">${escapeHtml(text)}</div>
      <div class="msg-meta">
        <span>${time}</span>
      </div>
    `;
    dom.body.appendChild(msgEl);
    scrollToBottom();
  };

  const showBotMessage = (text, speechText = null, quickReplies = []) => {
    const time = new Date().toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' });
    const formattedHtml = formatMarkdown(text);
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg bot';

    const speechToUse = speechText || cleanTextForSpeech(text);

    msgEl.innerHTML = `
      <div class="msg-bubble">${formattedHtml}</div>
      <div class="msg-meta">
        <span>🤖 शेतकरी AI • ${time}</span>
        <button type="button" class="btn-speak-replay" title="पुन्हा ऐका">
          <i class="fas fa-volume-high"></i> ऐका
        </button>
      </div>
    `;

    // Replay speech button listener
    const replayBtn = msgEl.querySelector('.btn-speak-replay');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        speak(speechToUse);
      });
    }

    dom.body.appendChild(msgEl);
    scrollToBottom();

    // Render new quick chips if provided
    if (quickReplies && quickReplies.length > 0) {
      renderQuickChips(quickReplies);
    }

    // Speak automatically if not muted
    if (!isMuted && speechToUse) {
      speak(speechToUse);
    }
  };

  const showTypingIndicator = () => {
    const typingEl = document.createElement('div');
    typingEl.id = 'assistant-typing-indicator';
    typingEl.className = 'chat-msg bot';
    typingEl.innerHTML = `
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    dom.body.appendChild(typingEl);
    scrollToBottom();
  };

  const removeTypingIndicator = () => {
    const indicator = document.getElementById('assistant-typing-indicator');
    if (indicator) indicator.remove();
  };

  const renderQuickChips = (chips) => {
    if (!dom.quickChips) return;
    dom.quickChips.innerHTML = '';
    chips.forEach((chip) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quick-chip-btn';
      btn.textContent = chip;
      btn.dataset.query = chip;
      dom.quickChips.appendChild(btn);
    });
  };

  const scrollToBottom = () => {
    if (dom.body) {
      setTimeout(() => {
        dom.body.scrollTop = dom.body.scrollHeight;
      }, 50);
    }
  };

  const clearChat = () => {
    if (dom.body) {
      dom.body.innerHTML = '';
      loadInitialGreeting();
    }
  };

  const loadInitialGreeting = () => {
    const user = API.getUser();
    const farmerName = user?.name || 'शेतकरी मित्र';
    const farmName = user?.farmName || 'आपले शेत';

    const greetingText = `🙏 **राम राम, ${farmerName}!**\n\nमी आपला **शेतकरी मित्र AI** सहाय्यक आहे. आपल्या **${farmName}** चे हिशोब, पिकांचा खर्च, मजुरी, उत्पन्न आणि नफा-तोटा मी मराठीत सांगू शकतो.\n\nआपण कोणताही प्रश्न आपल्या नेहमीच्या भाषेत टाईप करून किंवा माइकवर बोलून विचारू शकता (उदा. *"माझे किती पैसे खर्च झाले?"*, *"कामगारांचे काही देणे राहिले का?"*, *"सोयाबीनचे पैसे आले का?"*).\n\n💡 *टीप: खालील बटणे ही केवळ आपल्या सोयीसाठीचे ऐच्छिक शॉर्टकट आहेत.*`;
    const speech = `राम राम ${farmerName}! मी आपला शेतकरी मित्र सहाय्यक आहे. आपण मला खर्च, मजुरांची बाकी मजुरी, उत्पन्न किंवा ताळेबंदाबद्दल काहीही विचारू शकता.`;

    const initialChips = [
      '💰 एकूण खर्च किती?',
      '👷 मजुरांची बाकी मजुरी',
      '🌾 शेतमाल विक्री उत्पन्न',
      '📊 एकूण ताळेबंद व शिल्लक',
    ];

    showBotMessage(greetingText, speech, initialChips);
  };

  // ========================================================
  // 4. SUBMIT QUERY TO DATABASE-BACKED API
  // ========================================================
  const handleSubmit = async (queryText) => {
    if (!queryText || queryText.trim().length === 0) return;

    const query = queryText.trim();
    if (dom.input) dom.input.value = '';

    showUserMessage(query);
    showTypingIndicator();

    try {
      if (dom.sendBtn) dom.sendBtn.disabled = true;

      const response = await API.farmer.askAssistant(query);

      removeTypingIndicator();

      if (response && response.success && response.data) {
        const { reply, speechText, quickReplies } = response.data;
        showBotMessage(reply, speechText, quickReplies);
      } else {
        showBotMessage('माहिती मिळवण्यात अडचण आली. कृपया पुन्हा प्रयत्न करा.');
      }
    } catch (err) {
      removeTypingIndicator();
      console.error('Assistant submission error:', err);
      showBotMessage('⚠️ सर्व्हरशी संपर्क साधता आला नाही. कृपया इंटरनेट तपासा आणि पुन्हा प्रयत्न करा.');
    } finally {
      if (dom.sendBtn) dom.sendBtn.disabled = false;
    }
  };

  // ========================================================
  // 5. TEXT FORMATTING HELPERS
  // ========================================================
  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const formatMarkdown = (text) => {
    if (!text) return '';
    let html = escapeHtml(text);

    // Bold (**text** -> <strong>text</strong>)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert bullet points (• item -> clean styled item)
    html = html.replace(/•\s*(.*?)(?=(\n|$))/g, '<div style="margin-left: 6px; margin-bottom: 3px;">• $1</div>');

    // Horizontal dividers
    html = html.replace(/━+/g, '<hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 8px 0;">');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  };

  return {
    init,
    open: openAssistant,
    close: closeAssistant,
    ask: handleSubmit,
    syncUserRole,
  };
})();

// Auto-initialize when DOM ready and farmer is active
document.addEventListener('DOMContentLoaded', () => {
  // If farmer view is visible or when user logs in, initialize assistant
  MarathiAssistant.init();
});
