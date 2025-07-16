(function() {
  'use strict';

  // Inject scoped animation styles
  function injectStyles() {
    if (document.getElementById('rankved-chat-anim-style')) return;
    const style = document.createElement('style');
    style.id = 'rankved-chat-anim-style';
    style.textContent = `
      @keyframes rankved-bubble-pop {
        0% { transform: scale(0.5); opacity: 0; }
        80% { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes rankved-window-in {
        0% { transform: scale(0.8) translateY(40px); opacity: 0; }
        100% { transform: scale(1) translateY(0); opacity: 1; }
      }
      @keyframes rankved-window-out {
        0% { transform: scale(1) translateY(0); opacity: 1; }
        100% { transform: scale(0.8) translateY(40px); opacity: 0; }
      }
      @keyframes rankved-dot-bounce {
        0% { transform: translateY(0); }
        100% { transform: translateY(-6px); }
      }
      #rankved-chat-bubble[data-rankved-widget] {
        animation: rankved-bubble-pop 0.5s cubic-bezier(.5,1.8,.5,1) 0.1s both;
      }
      #rankved-chat-window[data-rankved-widget] {
        animation: rankved-window-in 0.35s cubic-bezier(.5,1.8,.5,1) 0s both;
      }
      #rankved-chat-window[data-rankved-closing] {
        animation: rankved-window-out 0.25s cubic-bezier(.5,1.8,.5,1) 0s both;
      }
    `;
    document.head.appendChild(style);
  }
  // Only get chatbotId and apiUrl from window.CHATBOT_CONFIG
  let config = {
    chatbotId: window.CHATBOT_CONFIG?.chatbotId,
    apiUrl: window.CHATBOT_CONFIG?.apiUrl
  };

  let isOpen = false;
  let bubble = null;
  let chatWindow = null;
  let configLoaded = false;

  // Sound effect for open/close
  function playOpenCloseSound() {
    try {
      const audio = new Audio('https://rank-ved-frontend-rfam.vercel.app/openclose.mp3');
      audio.currentTime = 0;
      audio.play();
    } catch (e) {
      console.log(e)
    }
  }

  // Fetch chatbot config from backend
  async function fetchChatbotConfig() {
    if (!config.chatbotId) {
      console.warn('[RankVed Chat] chatbotId missing at fetchChatbotConfig. window.CHATBOT_CONFIG:', window.CHATBOT_CONFIG);
      return;
    }
    let baseUrl = (typeof window !== 'undefined' && window.VITE_API_URL) ? window.VITE_API_URL : (config.apiUrl || window.location.origin);
    try {
      const res = await fetch(`${baseUrl}/api/chatbots/${config.chatbotId}/public`);
      if (res.ok) {
        config = await res.json();
        // Ensure chatbotId is always present
        if (config.id && !config.chatbotId) {
          config.chatbotId = config.id;
        }
        // Ensure apiUrl is always set from window.CHATBOT_CONFIG if present
        if (window.CHATBOT_CONFIG && window.CHATBOT_CONFIG.apiUrl) {
          config.apiUrl = window.CHATBOT_CONFIG.apiUrl;
        }
        // --- Robustly parse questionFlow ---
        if (typeof config.questionFlow === 'string') {
          try {
            config.questionFlow = JSON.parse(config.questionFlow);
          } catch (e) {
            config.questionFlow = undefined;
          }
        }
        // If questionFlow is an array, wrap as object
        if (Array.isArray(config.questionFlow)) {
          config.questionFlow = { nodes: config.questionFlow };
        }
        // If questionFlow is an object but nodes is a string, parse it
        if (config.questionFlow && typeof config.questionFlow.nodes === 'string') {
          try {
            config.questionFlow.nodes = JSON.parse(config.questionFlow.nodes);
          } catch (e) {
            config.questionFlow.nodes = [];
          }
        }
        // Debug log for question flow
        console.log('[RankVed Chat] After config fetch: questionFlowEnabled:', config.questionFlowEnabled, 'questionFlow:', config.questionFlow);
        // If no flow, add a default for testing
        if (!config.questionFlow || !Array.isArray(config.questionFlow.nodes) || config.questionFlow.nodes.length === 0) {
          config.questionFlowEnabled = true;
          config.questionFlow = { nodes: [
            { id: 'start', type: 'statement', question: 'This is a default flow. How can I help you?', nextId: 'end' },
            { id: 'end', type: 'statement', question: 'Thank you for using the chatbot!' }
          ] };
          console.log('[RankVed Chat] No question flow found. Injected default flow:', config.questionFlow);
        }
        configLoaded = true;
      } else {
        showError('Failed to load chatbot config.');
      }
    } catch (e) {
      showError('Failed to load chatbot config.');
    }
  }

  function showError(msg) {
    // Remove bubble if present
    if (bubble) bubble.remove();
    // Show error as a fixed banner
    const err = document.createElement('div');
    err.setAttribute('style', 'position:fixed;bottom:24px;right:24px;background:#ef4444;color:#fff;padding:16px 24px;border-radius:12px;z-index:2147483647;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,0.15);');
    err.textContent = msg;
    document.body.appendChild(err);
    setTimeout(() => err.remove(), 8000);
  }

  // Helper: Get appearance values from config with fallback
  function getAppearance() {
    const theme = config.chatWindowTheme || config.theme || 'light';
    const borderRadius = Number(config.borderRadius) || 12;
    const shadowStyle = config.shadowStyle || 'soft';
    let primaryColor = config.primaryColor || '#6366F1';
    if (!/^#([0-9A-F]{3}){1,2}$/i.test(primaryColor)) primaryColor = '#6366F1';
    const backgroundColor = theme === 'dark' ? '#18181b' : '#fff';
    let boxShadow = '0 10px 40px rgba(0,0,0,0.15)';
    if (shadowStyle === 'minimal') boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    if (shadowStyle === 'strong') boxShadow = '0 20px 60px rgba(0,0,0,0.25)';
    const textColor = theme === 'dark' ? '#fff' : '#333';
    const headerBg = primaryColor;
    const headerText = '#fff';
    const inputBg = theme === 'dark' ? '#23232a' : '#fff';
    const inputText = theme === 'dark' ? '#fff' : '#333';
    const inputBorder = theme === 'dark' ? '#333' : '#e2e8f0';
    const msgBg = theme === 'dark' ? '#23232a' : '#fff';
    const msgText = theme === 'dark' ? '#fff' : '#333';
    const userMsgBg = primaryColor;
    const userMsgText = '#fff';
    return {
      theme, borderRadius, shadowStyle, primaryColor, backgroundColor, boxShadow, textColor,
      headerBg, headerText, inputBg, inputText, inputBorder, msgBg, msgText, userMsgBg, userMsgText
    };
  }

  // Create chat bubble
  function createChatBubble() {
    const a = getAppearance();
    const bubble = document.createElement('div');
    bubble.setAttribute('id', 'rankved-chat-bubble');
    bubble.setAttribute('data-rankved-widget', 'true');
    bubble.setAttribute('style', `
      position: fixed; bottom: 24px; right: 24px; width: 60px; height: 60px; border-radius: ${a.borderRadius * 2}px;
      background: ${a.primaryColor}; box-shadow: ${a.boxShadow};
      display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 2147483647;
      transition: box-shadow 0.2s; border: none; outline: none; font-family: inherit; margin: 0; padding: 0;
    `);
    // Prefer chatWidgetIcon for the bubble, fallback to chatBubbleIcon, then default
    const iconSrc = config.chatWidgetIcon || config.chatBubbleIcon || config.bubbleIcon;
    bubble.innerHTML = iconSrc ?
      `<img src="${iconSrc}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; pointer-events: none;" alt="Chat Icon">` :
      `<svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>`;
    bubble.title = config.chatWidgetName || config.name || config.title || 'ChatBot';
    bubble.onclick = function() {
      openChat();
    };
    return bubble;
  }

  // Create chat window (strict, minimal, no iframe)
  function createChatWindow() {
    const a = getAppearance();
    const win = document.createElement('div');
    win.setAttribute('id', 'rankved-chat-window');
    win.setAttribute('data-rankved-widget', 'true');
    win.setAttribute('style', `
      position: fixed; bottom: 100px; right: 24px; width: 380px; height: 600px; max-height: 80vh;
      border-radius: ${a.borderRadius}px; background: ${a.backgroundColor}; box-shadow: ${a.boxShadow}; z-index: 2147483646;
      display: flex; flex-direction: column; overflow: hidden; font-family: inherit; border: 1px solid ${a.inputBorder};
      margin: 0; padding: 0; opacity: 1; transform: scale(1) translateY(0);
      color: ${a.textColor};
    `);
    // Prefer chatWidgetIcon for the header, fallback to chatWindowAvatar, then default SVG
    let headerIcon = config.chatWidgetIcon || config.chatWindowAvatar;
    let headerIconHTML = '';
    if (headerIcon) {
      headerIconHTML = `<img src="${headerIcon}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; background: #fff2; border: 2px solid #fff3;">`;
    } else {
      headerIconHTML = `<span style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: #fff2; border: 2px solid #fff3;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="7" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>`;
    }
    // Online status
    const onlineStatus = `<span style="display: flex; align-items: center; gap: 4px; font-size: 12px; margin-left: 4px;"><span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 4px #22c55e88;"></span><span style="color: #d1fae5;">Online</span></span>`;
    win.innerHTML = `
      <div style="background: ${a.primaryColor}; color: ${a.headerText}; padding: 14px; display: flex; align-items: center; justify-content: space-between; border-radius: ${a.borderRadius}px ${a.borderRadius}px 0 0;">
        <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
          ${headerIconHTML}
          <div style="display: flex; flex-direction: column; min-width: 0;">
            <span style="font-size: 16px; font-weight: 600; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${config.chatWidgetName || config.name || config.title || 'ChatBot'}</span>
            ${onlineStatus}
          </div>
        </div>
        <button id="rankved-close-btn" style="background: none; border: none; color: ${a.headerText}; font-size: 22px; cursor: pointer;">×</button>
      </div>
      <div id="rankved-messages" style="flex: 1; overflow-y: auto; padding: 18px 14px 0 14px; background: ${a.msgBg}; color: ${a.msgText}; display: flex; flex-direction: column; gap: 14px; border-bottom-left-radius: ${a.borderRadius}px; border-bottom-right-radius: ${a.borderRadius}px;">
        <!-- Welcome message removed; will be added by JS only -->
      </div>
      <div style="padding: 14px 14px 10px 14px; border-top: 1px solid ${a.inputBorder}; background: ${a.inputBg}; border-bottom-left-radius: ${a.borderRadius}px; border-bottom-right-radius: ${a.borderRadius}px;">
        <div style="display: flex; gap: 8px; align-items: center;">
          <input id="rankved-input" placeholder="${config.inputPlaceholder || config.placeholder || 'Type your message...'}" style="flex: 1; border: 1px solid ${a.inputBorder}; border-radius: 12px; padding: 10px 14px; font-size: 15px; outline: none; background: ${a.inputBg}; color: ${a.inputText}; height: 38px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
          <button id="rankved-send-btn" style="width: 38px; height: 38px; border-radius: 12px; background: ${a.primaryColor}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/></svg>
          </button>
        </div>
        <div id="rankved-suggestions" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px;"></div>
        <div style="text-align: center; padding: 8px 0 0 0; font-size: 12px; color: ${a.theme === 'dark' ? '#aaa' : '#666'}; background: none;">
          ${config.poweredByText ? `<span>${config.poweredByLink ? `<a href="${config.poweredByLink}" target="_blank" style="color: ${a.primaryColor}; text-decoration: none;">${config.poweredByText}</a>` : config.poweredByText}</span>` : `Powered by <a href="https://rankved.com" target="_blank" style="color: ${a.primaryColor}; text-decoration: none;">RankVed</a>`}
        </div>
      </div>
    `;
    return win;
  }

  // Add message to chat
  function addMessage(content, sender) {
    const a = getAppearance();
    const messagesContainer = document.getElementById('rankved-messages');
    if (!messagesContainer) return;
    const messageDiv = document.createElement('div');
    if (sender === 'user') {
      messageDiv.setAttribute('style', `margin-bottom: 14px; display: flex; justify-content: flex-end;`);
      const contentDiv = document.createElement('div');
      contentDiv.setAttribute('style', `max-width: 80%; padding: 10px 16px; border-radius: 18px; font-size: 14px; background: ${a.userMsgBg}; color: ${a.userMsgText};`);
      contentDiv.textContent = content;
      messageDiv.appendChild(contentDiv);
    } else {
      messageDiv.setAttribute('style', `margin-bottom: 14px; display: flex; justify-content: flex-start; align-items: flex-start; gap: 8px;`);
      const avatarDiv = document.createElement('div');
      // Use the same fallback logic as header: chatWidgetIcon, then chatWindowAvatar, then default SVG
      let botIcon = config.chatWidgetIcon || config.chatWindowAvatar;
      if (botIcon) {
        avatarDiv.innerHTML = `<img src="${botIcon}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; background: #fff2; border: 2px solid #fff3;">`;
      } else {
        avatarDiv.innerHTML = `<span style=\"display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: #fff2; border: 2px solid #fff3;\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#6366F1\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"11\" width=\"18\" height=\"7\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 0 1 8 0v4\"/></svg></span>`;
      }
      messageDiv.appendChild(avatarDiv);
      const contentDiv = document.createElement('div');
      contentDiv.setAttribute('style', `max-width: 80%; padding: 10px 16px; border-radius: 12px; font-size: 14px; background: ${a.msgBg}; color: ${a.msgText}; box-shadow: 0 1px 2px rgba(0,0,0,0.08);`);
      contentDiv.textContent = content;
      messageDiv.appendChild(contentDiv);
    }
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Show suggestion buttons if present
  function showSuggestions() {
    const suggestions = config.suggestionButtons;
    const container = document.getElementById('rankved-suggestions');
    if (!container) return;
    container.innerHTML = '';
    if (Array.isArray(suggestions) && suggestions.length > 0) {
      suggestions.forEach((text) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.setAttribute('style', `background: ${getAppearance().primaryColor}; color: #fff; border: none; border-radius: 6px; padding: 6px 12px; font-size: 13px; cursor: pointer; margin: 0;`);
        btn.onclick = function() {
          addMessage(text, 'user');
          if (config.suggestionPersistence !== 'always_visible') btn.style.display = 'none';
        };
        container.appendChild(btn);
      });
    }
  }

  // --- Question Flow State ---
  let questionFlowState = {
    currentNodeId: null,
    history: [],
    userInputs: {},
  };

  function resetQuestionFlow() {
    questionFlowState = {
      currentNodeId: null,
      history: [],
      userInputs: {},
    };
  }

   function renderQuestionNode(node) {
    const messagesContainer = document.getElementById('rankved-messages');
    if (!messagesContainer || !node) return;
    addMessage(node.question, 'bot');
    // Track flow history
    questionFlowState.history.push(node.id);
    // Remove any previous options/input
    const oldOptions = document.getElementById('rankved-flow-options');
    if (oldOptions) oldOptions.remove();
    const oldInput = document.getElementById('rankved-flow-input');
    if (oldInput) oldInput.remove();
    // Handle node types
    if (node.type === 'multiple-choice' && node.options && node.options.length > 0) {
      const optionsDiv = document.createElement('div');
      optionsDiv.id = 'rankved-flow-options';
      optionsDiv.style.margin = '8px 0';
      optionsDiv.style.display = 'flex';
      optionsDiv.style.flexDirection = 'column';
      optionsDiv.style.gap = '6px';
      node.options.forEach(option => {
        const btn = document.createElement('button');
        btn.textContent = option.text;
        btn.style.background = getAppearance().primaryColor;
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.style.borderRadius = '6px';
        btn.style.padding = '8px 12px';
        btn.style.fontSize = '14px';
        btn.style.cursor = 'pointer';
        btn.onclick = function() {
          addMessage(option.text, 'user');
          // Track user input
          questionFlowState.userInputs[node.id] = option.text;
          questionFlowState.currentNodeId = node.id;
          if (option.action === 'collect-lead') {
            addMessage('Thank you! Please provide your contact information so we can help you better.', 'bot');
            optionsDiv.remove();
            return;
          }
          if (option.action === 'end-chat') {
            addMessage('Thank you for using our service! Have a great day!', 'bot');
            optionsDiv.remove();
            return;
          }
          if (option.nextId) {
            optionsDiv.remove();
            const nextNode = config.questionFlow.nodes.find(n => n.id === option.nextId);
            if (nextNode) {
              questionFlowState.currentNodeId = nextNode.id;
              setTimeout(() => renderQuestionNode(nextNode), 500);
            }
          }
        };
        optionsDiv.appendChild(btn);
      });
      messagesContainer.appendChild(optionsDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } else if (node.type === 'open-ended') {
      const inputDiv = document.createElement('div');
      inputDiv.id = 'rankved-flow-input';
      inputDiv.style.margin = '8px 0';
      inputDiv.style.display = 'flex';
      inputDiv.style.gap = '6px';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Type your answer...';
      input.style.flex = '1';
      input.style.padding = '8px 12px';
      input.style.borderRadius = '6px';
      input.style.border = '1px solid #e2e8f0';
      input.style.fontSize = '14px';
      const sendBtn = document.createElement('button');
      sendBtn.textContent = 'Send';
      sendBtn.style.background = getAppearance().primaryColor;
      sendBtn.style.color = '#fff';
      sendBtn.style.border = 'none';
      sendBtn.style.borderRadius = '6px';
      sendBtn.style.padding = '8px 16px';
      sendBtn.style.fontSize = '14px';
      sendBtn.style.cursor = 'pointer';
      sendBtn.onclick = function() {
        if (!input.value.trim()) return;
        addMessage(input.value, 'user');
        // Track user input
        questionFlowState.userInputs[node.id] = input.value;
        questionFlowState.currentNodeId = node.id;
        input.disabled = true;
        sendBtn.disabled = true;
        // Simulate AI handling if enabled
        if (node.aiHandling) {
          setTimeout(() => {
            addMessage(`I understand you're asking about: "${input.value}". Let me help you with that. Is there anything specific you'd like to know more about?`, 'bot');
            // Show follow-up options
            const followUpDiv = document.createElement('div');
            followUpDiv.id = 'rankved-flow-options';
            followUpDiv.style.margin = '8px 0';
            followUpDiv.style.display = 'flex';
            followUpDiv.style.flexDirection = 'column';
            followUpDiv.style.gap = '6px';
            [
              { text: 'Tell me more', nextId: node.nextId },
              { text: 'Contact support', action: 'collect-lead' },
              { text: 'End chat', action: 'end-chat' }
            ].forEach(opt => {
              const btn = document.createElement('button');
              btn.textContent = opt.text;
              btn.style.background = getAppearance().primaryColor;
              btn.style.color = '#fff';
              btn.style.border = 'none';
              btn.style.borderRadius = '6px';
              btn.style.padding = '8px 12px';
              btn.style.fontSize = '14px';
              btn.style.cursor = 'pointer';
              btn.onclick = function() {
                addMessage(opt.text, 'user');
                // Track user input for follow-up
                questionFlowState.userInputs[node.id + '_followup'] = opt.text;
                questionFlowState.currentNodeId = node.id;
                if (opt.action === 'collect-lead') {
                  addMessage('Thank you! Please provide your contact information so we can help you better.', 'bot');
                  followUpDiv.remove();
                  return;
                }
                if (opt.action === 'end-chat') {
                  addMessage('Thank you for using our service! Have a great day!', 'bot');
                  followUpDiv.remove();
                  return;
                }
                if (opt.nextId) {
                  followUpDiv.remove();
                  const nextNode = config.questionFlow.nodes.find(n => n.id === opt.nextId);
                  if (nextNode) {
                    questionFlowState.currentNodeId = nextNode.id;
                    setTimeout(() => renderQuestionNode(nextNode), 500);
                  }
                }
              };
              followUpDiv.appendChild(btn);
            });
            messagesContainer.appendChild(followUpDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }, 1000);
        } else if (node.nextId) {
          const nextNode = config.questionFlow.nodes.find(n => n.id === node.nextId);
          if (nextNode) {
            questionFlowState.currentNodeId = nextNode.id;
            setTimeout(() => renderQuestionNode(nextNode), 500);
          }
        }
      };
      inputDiv.appendChild(input);
      inputDiv.appendChild(sendBtn);
      messagesContainer.appendChild(inputDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } else if (node.type === 'contact-form') {
      const inputDiv = document.createElement('div');
      inputDiv.id = 'rankved-flow-input';
      inputDiv.style.margin = '8px 0';
      inputDiv.style.display = 'flex';
      inputDiv.style.flexDirection = 'column';
      inputDiv.style.gap = '6px';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = 'Your Name';
      nameInput.style.padding = '8px 12px';
      nameInput.style.borderRadius = '6px';
      nameInput.style.border = '1px solid #e2e8f0';
      nameInput.style.fontSize = '14px';
      const emailInput = document.createElement('input');
      emailInput.type = 'email';
      emailInput.placeholder = 'Your Email';
      emailInput.style.padding = '8px 12px';
      emailInput.style.borderRadius = '6px';
      emailInput.style.border = '1px solid #e2e8f0';
      emailInput.style.fontSize = '14px';
      // Add mobile number input
      const phoneInput = document.createElement('input');
      phoneInput.type = 'tel';
      phoneInput.placeholder = 'Your Mobile Number';
      phoneInput.style.padding = '8px 12px';
      phoneInput.style.borderRadius = '6px';
      phoneInput.style.border = '1px solid #e2e8f0';
      phoneInput.style.fontSize = '14px';
      // Add consent checkbox
      const consentDiv = document.createElement('div');
      consentDiv.style.display = 'flex';
      consentDiv.style.alignItems = 'center';
      consentDiv.style.gap = '8px';
      const consentCheckbox = document.createElement('input');
      consentCheckbox.type = 'checkbox';
      consentCheckbox.id = 'rankved-consent-checkbox';
      const consentLabel = document.createElement('label');
      consentLabel.htmlFor = 'rankved-consent-checkbox';
      consentLabel.textContent = 'I consent to be contacted.';
      consentLabel.style.fontSize = '13px';
      consentDiv.appendChild(consentCheckbox);
      consentDiv.appendChild(consentLabel);
      const sendBtn = document.createElement('button');
      sendBtn.textContent = 'Send';
      sendBtn.style.background = getAppearance().primaryColor;
      sendBtn.style.color = '#fff';
      sendBtn.style.border = 'none';
      sendBtn.style.borderRadius = '6px';
      sendBtn.style.padding = '8px 16px';
      sendBtn.style.fontSize = '14px';
      sendBtn.style.cursor = 'pointer';
      sendBtn.onclick = async function() {
        if (!nameInput.value.trim() || !emailInput.value.trim() || !phoneInput.value.trim() || !consentCheckbox.checked) return;
        addMessage(`Name: ${nameInput.value}, Email: ${emailInput.value}, Phone: ${phoneInput.value}, Consent: Yes`, 'user');
        sendBtn.disabled = true;
        // --- Send lead data to backend (public endpoint) ---
        try {
          let apiUrl =
            (typeof window !== 'undefined' && window.VITE_API_URL) ? window.VITE_API_URL
            : (config.apiUrl || (window.CHATBOT_CONFIG && window.CHATBOT_CONFIG.apiUrl) || window.location.origin);
          const chatbotId = config.chatbotId || (window.CHATBOT_CONFIG && window.CHATBOT_CONFIG.chatbotId);
          if (!chatbotId) {
            addMessage('Chatbot ID is missing. Please refresh the page.', 'bot');
            return;
          }
          // Build context from questionFlowState (add more if needed)
          const context = { questionFlowState };
          const res = await fetch(apiUrl + '/api/chat/' + chatbotId + '/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: nameInput.value,
              email: emailInput.value,
              phone: phoneInput.value,
              consentGiven: consentCheckbox.checked,
              source: 'chat_widget',
              conversationContext: context // <-- send context here
            })
          });
          if (res.ok) {
            addMessage('Thank you! Our team will contact you soon.', 'bot');
          } else {
            addMessage('Failed to submit your info. Please try again later.', 'bot');
          }
        } catch (e) {
          addMessage('Failed to submit your info. Please try again later.', 'bot');
        }
      };
      inputDiv.appendChild(nameInput);
      inputDiv.appendChild(emailInput);
      inputDiv.appendChild(phoneInput);
      inputDiv.appendChild(consentDiv);
      inputDiv.appendChild(sendBtn);
      messagesContainer.appendChild(inputDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    if (node.type === 'statement' && node.nextId) {
      setTimeout(() => {
        const nextNode = config.questionFlow.nodes.find(n => n.id === node.nextId);
        if (nextNode) {
          questionFlowState.currentNodeId = nextNode.id;
          renderQuestionNode(nextNode);
        }
      }, 900); // 900ms delay for smoothness
    }
  }

  // Open chat window with animation
  async function openChat() {
    playOpenCloseSound();
    if (isOpen) return;
    if (!configLoaded) {
      await fetchChatbotConfig();
      if (!configLoaded) return; // If still not loaded, abort
    }
    chatWindow = createChatWindow();
    document.body.appendChild(chatWindow);
    isOpen = true;
    // --- Show question flow if it exists, otherwise show welcome message ---
    console.log('[RankVed Chat] openChat: questionFlowEnabled:', config.questionFlowEnabled, 'questionFlow:', config.questionFlow);
    if (config.questionFlowEnabled && config.questionFlow && Array.isArray(config.questionFlow.nodes) && config.questionFlow.nodes.length > 0) {
      resetQuestionFlow();
      const startNode = config.questionFlow.nodes.find(n => n.id === 'start') || config.questionFlow.nodes[0];
      if (startNode) {
        questionFlowState.currentNodeId = startNode.id;
        setTimeout(() => renderQuestionNode(startNode), 500);
      }
    } else {
      addMessage(config.welcomeMessage || 'Hello! How can I help you today?', 'bot');
      showSuggestions();
    }
    chatWindow.querySelector('#rankved-close-btn').onclick = closeChat;
    chatWindow.querySelector('#rankved-send-btn').onclick = sendMessage;
    chatWindow.querySelector('#rankved-input').onkeydown = function(e) {
      if (e.key === 'Enter') sendMessage();
    };
  }

  // Close chat window with animation
  function closeChat() {
    playOpenCloseSound();
    if (chatWindow) {
      chatWindow.setAttribute('data-rankved-closing', 'true');
      setTimeout(() => {
        chatWindow.remove();
        chatWindow = null;
    isOpen = false;
      }, 250);
    }
  }

  function showLoadingMessage() {
    const messagesContainer = document.getElementById('rankved-messages');
    if (!messagesContainer) return;
    // Remove any existing loading message
    const oldLoading = document.getElementById('rankved-loading-message');
    if (oldLoading) oldLoading.remove();
    // Add new loading message
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'rankved-loading-message';
    loadingDiv.setAttribute('style', 'margin-bottom: 14px; display: flex; justify-content: flex-start; align-items: flex-start; gap: 8px;');
    loadingDiv.innerHTML = `
      <div style="width: 28px; height: 28px;"></div>
      <div style="max-width: 80%; padding: 10px 16px; border-radius: 12px; font-size: 14px; background: #f3f4f6; color: #333; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
        <span class="rankved-typing-dots" style="display: inline-block;">
          <span style="display:inline-block;width:6px;height:6px;background:#6366F1;border-radius:50%;margin-right:2px;animation:rankved-dot-bounce 1s infinite alternate;"></span>
          <span style="display:inline-block;width:6px;height:6px;background:#6366F1;border-radius:50%;margin-right:2px;animation:rankved-dot-bounce 1s 0.2s infinite alternate;"></span>
          <span style="display:inline-block;width:6px;height:6px;background:#6366F1;border-radius:50%;animation:rankved-dot-bounce 1s 0.4s infinite alternate;"></span>
        </span>
      </div>
    `;
    messagesContainer.appendChild(loadingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function removeLoadingMessage() {
    const oldLoading = document.getElementById('rankved-loading-message');
    if (oldLoading) oldLoading.remove();
  }

  // Send message to backend
  async function sendMessage() {
    const input = chatWindow.querySelector('#rankved-input');
    const text = input.value.trim();
    if (!text) return;
    if (!config.chatbotId) {
      console.error('[RankVed Chat] chatbotId is missing at sendMessage. window.CHATBOT_CONFIG:', window.CHATBOT_CONFIG, 'config:', config);
      addMessage('Chatbot ID is missing. Please refresh the page.', 'bot');
      return;
    }
    addMessage(text, 'user');
    input.value = '';
    showLoadingMessage(); // Show loading indicator
    // Build context for backend
    let context = {
      messageCount: (questionFlowState.history?.length || 0) + 1,
      manualMessageCount: (questionFlowState.history?.length || 0) + 1,
      isFlowBased: !!(config.questionFlowEnabled && config.questionFlow && Array.isArray(config.questionFlow.nodes) && config.questionFlow.nodes.length > 0),
      usingSuggestions: false,
      flowState: questionFlowState,
    };
    try {
      const res = await fetch(`${config.apiUrl || ''}/api/chat/${config.chatbotId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context })
      });
      removeLoadingMessage(); // Remove loading indicator
      if (res.ok) {
        const data = await res.json();
        if (data.type === 'form' || data.shouldCollectLead) {
          // Show lead collection form
          renderLeadForm();
        } else {
          addMessage(data.message || '...', 'bot');
        }
      } else {
        addMessage('Sorry, there was a problem. Please try again.', 'bot');
      }
    } catch (e) {
      removeLoadingMessage(); // Remove loading indicator on error
      addMessage('Sorry, there was a problem. Please try again.', 'bot');
    }
  }

  // Render lead collection form (when backend says to collect lead)
  function renderLeadForm() {
    const messagesContainer = document.getElementById('rankved-messages');
    if (!messagesContainer) return;
    // Remove any previous input
    const oldInput = document.getElementById('rankved-flow-input');
    if (oldInput) oldInput.remove();
    const inputDiv = document.createElement('div');
    inputDiv.id = 'rankved-flow-input';
    inputDiv.style.margin = '8px 0';
    inputDiv.style.display = 'flex';
    inputDiv.style.flexDirection = 'column';
    inputDiv.style.gap = '6px';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Your Name';
    nameInput.style.padding = '8px 12px';
    nameInput.style.borderRadius = '6px';
    nameInput.style.border = '1px solid #e2e8f0';
    nameInput.style.fontSize = '14px';
    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.placeholder = 'Your Email';
    emailInput.style.padding = '8px 12px';
    emailInput.style.borderRadius = '6px';
    emailInput.style.border = '1px solid #e2e8f0';
    emailInput.style.fontSize = '14px';
    const phoneInput = document.createElement('input');
    phoneInput.type = 'tel';
    phoneInput.placeholder = 'Your Mobile Number';
    phoneInput.style.padding = '8px 12px';
    phoneInput.style.borderRadius = '6px';
    phoneInput.style.border = '1px solid #e2e8f0';
    phoneInput.style.fontSize = '14px';
    const consentDiv = document.createElement('div');
    consentDiv.style.display = 'flex';
    consentDiv.style.alignItems = 'center';
    consentDiv.style.gap = '8px';
    const consentCheckbox = document.createElement('input');
    consentCheckbox.type = 'checkbox';
    consentCheckbox.id = 'rankved-consent-checkbox';
    const consentLabel = document.createElement('label');
    consentLabel.htmlFor = 'rankved-consent-checkbox';
    consentLabel.textContent = 'I consent to be contacted.';
    consentLabel.style.fontSize = '13px';
    consentDiv.appendChild(consentCheckbox);
    consentDiv.appendChild(consentLabel);
    const sendBtn = document.createElement('button');
    sendBtn.textContent = 'Send';
    sendBtn.style.background = getAppearance().primaryColor;
    sendBtn.style.color = '#fff';
    sendBtn.style.border = 'none';
    sendBtn.style.borderRadius = '6px';
    sendBtn.style.padding = '8px 16px';
    sendBtn.style.fontSize = '14px';
    sendBtn.style.cursor = 'pointer';
    sendBtn.onclick = async function() {
      if (!nameInput.value.trim() || !emailInput.value.trim() || !phoneInput.value.trim() || !consentCheckbox.checked) return;
      addMessage(`Name: ${nameInput.value}, Email: ${emailInput.value}, Phone: ${phoneInput.value}, Consent: Yes`, 'user');
      sendBtn.disabled = true;
      try {
        let apiUrl = (typeof window !== 'undefined' && window.VITE_API_URL) ? window.VITE_API_URL : (config.apiUrl || (window.CHATBOT_CONFIG && window.CHATBOT_CONFIG.apiUrl) || window.location.origin);
        const chatbotId = config.chatbotId || (window.CHATBOT_CONFIG && window.CHATBOT_CONFIG.chatbotId);
        if (!chatbotId) {
          addMessage('Chatbot ID is missing. Please refresh the page.', 'bot');
          return;
        }
        // Build context from questionFlowState
        const context = { questionFlowState };
        const res = await fetch(apiUrl + '/api/chat/' + chatbotId + '/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nameInput.value,
            email: emailInput.value,
            phone: phoneInput.value,
            consentGiven: consentCheckbox.checked,
            source: 'chat_widget',
            conversationContext: context
          })
        });
        if (res.ok) {
          addMessage('Thank you! Our team will contact you soon.', 'bot');
        } else {
          addMessage('Failed to submit your info. Please try again later.', 'bot');
        }
      } catch (e) {
        addMessage('Failed to submit your info. Please try again later.', 'bot');
      }
    };
    inputDiv.appendChild(nameInput);
    inputDiv.appendChild(emailInput);
    inputDiv.appendChild(phoneInput);
    inputDiv.appendChild(consentDiv);
    inputDiv.appendChild(sendBtn);
    messagesContainer.appendChild(inputDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Initialize
  async function init() {
    injectStyles();
    await fetchChatbotConfig(); // Wait for config to load before rendering bubble
    // If question flow is enabled and present, preload the first node as a preview (optional)
    if (config.questionFlowEnabled && config.questionFlow && Array.isArray(config.questionFlow.nodes) && config.questionFlow.nodes.length > 0) {
      resetQuestionFlow();
      const startNode = config.questionFlow.nodes.find(n => n.id === 'start') || config.questionFlow.nodes[0];
      if (startNode) {
        questionFlowState.currentNodeId = startNode.id;
        // Optionally, show a preview or indicator here
        // e.g., addMessage('Ready for a guided conversation!', 'bot');
      }
    } else {
      if (!config.questionFlowEnabled) console.log('Question flow not enabled');
      if (!config.questionFlow) console.log('No question flow data');
    }
    bubble = createChatBubble();
    document.body.appendChild(bubble);
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();