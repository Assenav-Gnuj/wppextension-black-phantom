// Variáveis de estado
let selectedGroup = '';
let welcomeMessage = '';
let isActive = false;
let isPaused = false;
let messageLimit = 100;
let messagesSent = 0;
let messagesResponded = 0;
let failedMessages = [];
let panelInjected = false;

// Criar o elemento do painel flutuante
function createPanel() {
  if (panelInjected) return;
  
  // Verificar se o painel já existe
  if (document.getElementById('black-phantom-panel')) {
    document.getElementById('black-phantom-panel').style.display = 'block';
    return;
  }
  
  // Criar o iframe para o painel
  const iframe = document.createElement('iframe');
  iframe.id = 'black-phantom-panel';
  iframe.style.position = 'fixed';
  iframe.style.top = '20px';
  iframe.style.right = '20px';
  iframe.style.width = '420px';
  iframe.style.height = '600px';
  iframe.style.border = '1px solid #6E6C7E';
  iframe.style.borderRadius = '8px';
  iframe.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
  iframe.style.zIndex = '9999';
  iframe.style.backgroundColor = '#1E1E2E';
  iframe.src = chrome.runtime.getURL('panel.html');
  
  document.body.appendChild(iframe);
  panelInjected = true;
  
  // Registrar mensagem de log
  logMessage('Painel de controle inicializado');
}

// Ocultar o painel
function hidePanel() {
  const panel = document.getElementById('black-phantom-panel');
  if (panel) {
    panel.style.display = 'none';
  }
}

// Função para observar novos membros em um grupo
function monitorGroup() {
  if (!isActive || isPaused || !selectedGroup) return;
  
  // Registrar informação adicional para debug
  logMessage(`Iniciando monitoramento avançado para o grupo: ${selectedGroup}`, 'info');
  
  // Mecanismo para detectar quando o chat muda e reajustar o monitoramento
  const headerObserver = new MutationObserver(() => {
    // Verificar se ainda estamos no grupo correto
    const headerElements = document.querySelectorAll('#main header span[title], #main header div[title], [data-testid="conversation-header"] span');
    let inCorrectGroup = false;
    
    for (const header of headerElements) {
      if (header.title === selectedGroup || header.textContent.includes(selectedGroup)) {
        inCorrectGroup = true;
        break;
      }
    }
    
    if (!inCorrectGroup) {
      console.log('[Black Phantom] Detectada mudança de chat, tentando retornar ao grupo monitorado');
      
      // Se estamos em outro chat, tentar voltar ao grupo
      setTimeout(() => {
        selectGroup().then(success => {
          if (success) {
            console.log('[Black Phantom] Retornado com sucesso ao grupo monitorado');
          } else {
            console.warn('[Black Phantom] Não foi possível retornar ao grupo monitorado automaticamente');
          }
        });
      }, 1000);
    }
  });
  
  // Observar mudanças no cabeçalho
  const header = document.querySelector('#main header');
  if (header) {
    headerObserver.observe(header, { childList: true, subtree: true, attributes: true });
    console.log('[Black Phantom] Monitorando cabeçalho para detectar mudanças de chat');
  }
  
  // Observer para monitorar mensagens do sistema (novos membros)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (let node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Melhorada a detecção para incluir mais variações de mensagens de sistema
            const possibleKeywords = [
              'adicionou', 'added', 'entrou', 'joined', 'ingressou', 'entered'
            ];
            
            // Log para depuração melhorado e mais detalhado
            if (node.innerText) {
              const text = node.innerText.toLowerCase();
              if (possibleKeywords.some(keyword => text.includes(keyword))) {
                console.log('[Black Phantom] Possível mensagem de novo membro detectada:', node);
                console.log('[Black Phantom] Conteúdo da mensagem:', node.innerText);
                console.log('[Black Phantom] Classes do elemento:', node.className);
                console.log('[Black Phantom] HTML interno:', node.innerHTML.substring(0, 150) + '...');
                logMessage(`Texto detectado: ${node.innerText.substring(0, 50)}...`, 'debug');
              }
            }
            
            // Tentar diferentes seletores para mensagens do sistema
            let systemMsg = null;
            
            // Primeiramente, verifica se o próprio nó adicionado é uma mensagem do sistema
            if (node.innerText && possibleKeywords.some(keyword => node.innerText.toLowerCase().includes(keyword))) {
              console.log('[Black Phantom] O próprio nó parece ser uma mensagem de sistema:', node);
              systemMsg = node;
            }
            
            // Se não for, procura em seus filhos com seletores específicos
            if (!systemMsg || !systemMsg.textContent) {
              // Verificação 1: Seletores atualizados para 2025
              const updatedSelectors = [
                // Seletores atualizados para WhatsApp Web 2025
                '[data-id*="system-message"]',
                '[data-testid*="system-message"]',
                '.system-message',
                '.message--system',
                // Seletores para mensagens de adição/saída
                '[data-testid="group-notification"]',
                '[data-testid="system-notification"]',
                // Seletores baseados em atributos
                '[role="row"][data-id*="@g.us"]',
                // Seletores clássicos
                'div[data-id*="@g.us"] span', 
                'div[data-id*="@g.us-"] span',
                '.message-system span', 
                '.Qe4M8', 
                '.QmSZ2', 
                '._3z9_h', 
                '._2Nr6U', 
                '._1qB8f'
              ];
              
              for (const selector of updatedSelectors) {
                const elements = node.querySelectorAll(selector);
                if (elements.length > 0) {
                  for (const el of elements) {
                    if (el.textContent && possibleKeywords.some(keyword => el.textContent.toLowerCase().includes(keyword))) {
                      systemMsg = el;
                      console.log('[Black Phantom] Mensagem de sistema encontrada com seletor:', selector);
                      break;
                    }
                  }
                }
                if (systemMsg) break;
              }
            }
            
            // Verificação 2: Qualquer div com estilo de mensagem de sistema
            if (!systemMsg || !systemMsg.textContent) {
              const roleElements = node.querySelectorAll('div[role="row"] div[role="cell"] div:not([class*="quoted"])');
              for (const el of roleElements) {
                if (el.textContent && possibleKeywords.some(keyword => el.textContent.toLowerCase().includes(keyword))) {
                  systemMsg = el;
                  console.log('[Black Phantom] Mensagem de sistema encontrada em elemento com role');
                  break;
                }
              }
            }
            
            // Verificação 3: Qualquer span em um container de mensagem que possa ser do sistema
            if (!systemMsg || !systemMsg.textContent) {
              const messageContainers = node.querySelectorAll('[data-testid="msg-container"]');
              for (const container of messageContainers) {
                const spans = container.querySelectorAll('span');
                for (const span of spans) {
                  const text = span.textContent.toLowerCase();
                  if (possibleKeywords.some(keyword => text.includes(keyword))) {
                    systemMsg = span;
                    console.log('[Black Phantom] Mensagem de sistema encontrada em span dentro de msg-container');
                    break;
                  }
                }
                if (systemMsg) break;
              }
            }
            
            // Verificação 5: Qualquer elemento com mensagem de adição
            if (!systemMsg || !systemMsg.textContent) {
              // Procurar em todos os elementos de texto
              const textElements = node.querySelectorAll('span, div');
              for (const element of textElements) {
                if (element.textContent) {
                  const text = element.textContent.toLowerCase();
                  if (possibleKeywords.some(keyword => text.includes(keyword))) {
                    systemMsg = element;
                    break;
                  }
                }
              }
            }
            
            // Processar a mensagem do sistema se for sobre adição de membro
            if (systemMsg && systemMsg.textContent) {
              const text = systemMsg.textContent.toLowerCase();
              const isAddMemberMsg = text.includes('adicionou') || 
                                    text.includes('added') || 
                                    text.includes('entrou') || 
                                    text.includes('joined');
              
              if (isAddMemberMsg) {
                // Log para depuração com timestamp para melhor rastreabilidade
                const time = new Date().toLocaleTimeString();
                logMessage(`[${time}] Mensagem de sistema detectada: "${systemMsg.textContent}"`, 'info');
                console.log(`[Black Phantom] [${time}] Mensagem de sistema encontrada:`, systemMsg.textContent);
                
                // Tentar diferentes padrões para extrair número e nome
                let phoneNumber = null;
                let name = null;
                
                // Padrão 1: Número de telefone com formato internacional
                const phoneMatches = systemMsg.textContent.match(/(\+\d+|\d+)/g);
                if (phoneMatches && phoneMatches.length > 0) {
                  phoneNumber = phoneMatches[phoneMatches.length - 1];
                  console.log('[Black Phantom] Número detectado:', phoneNumber);
                }
                
                // Padrão 2: Extrair nome após "adicionou" ou "added"
                const addedRegex = /(?:adicionou|added)\s+([^.,]+)/i;
                const addedMatch = systemMsg.textContent.match(addedRegex);
                if (addedMatch && addedMatch[1]) {
                  // Extrair o nome completo e então apenas o primeiro nome
                  const fullName = addedMatch[1].trim();
                  name = fullName.split(/\s+/)[0]; // Pegar apenas o primeiro nome
                  console.log('[Black Phantom] Nome completo detectado:', fullName);
                  console.log('[Black Phantom] Primeiro nome para uso:', name);
                }
                
                // Tentar outro padrão em português: "X entrou usando o link de convite"
                if (!name && text.includes('entrou usando')) {
                  const enteredRegex = /([^\s]+)\s+entrou usando/i;
                  const enteredMatch = systemMsg.textContent.match(enteredRegex);
                  if (enteredMatch && enteredMatch[1]) {
                    name = enteredMatch[1].trim();
                    console.log('[Black Phantom] Nome detectado por padrão "entrou usando":', name);
                  }
                }
                
                // Tentar outro padrão em inglês: "X joined using invite link"
                if (!name && text.includes('joined using')) {
                  const joinedRegex = /([^\s]+)\s+joined using/i;
                  const joinedMatch = systemMsg.textContent.match(joinedRegex);
                  if (joinedMatch && joinedMatch[1]) {
                    name = joinedMatch[1].trim();
                    console.log('[Black Phantom] Nome detectado por padrão "joined using":', name);
                  }
                }
                
                // Tentar mais alguns padrões comuns para extrair nomes
                if (!name) {
                  // Padrão genérico: qualquer nome antes de "entrou" ou "joined"
                  const genericRegex = /([^\s]+)\s+(?:entrou|joined|ingressou|entered)/i;
                  const genericMatch = systemMsg.textContent.match(genericRegex);
                  if (genericMatch && genericMatch[1]) {
                    name = genericMatch[1].trim();
                    console.log('[Black Phantom] Nome detectado por padrão genérico:', name);
                  }
                }
                
                // Se não conseguir o nome, usar um nome genérico
                if (!name) {
                  name = 'membro';
                  console.log('[Black Phantom] Usando nome genérico:', name);
                }
                
                // Se conseguiu identificar o membro
                if (phoneNumber || name) {
                  // Verificar se já atingiu o limite
                  if (messagesSent >= messageLimit) {
                    logMessage(`Limite de ${messageLimit} mensagens atingido. Pausando envios.`, 'warning');
                    isPaused = true;
                    saveState();
                    return;
                  }
                  
                  // Se não temos o número, apenas usamos o nome
                  if (!phoneNumber) phoneNumber = name;
                  
                  // Registrar novo membro
                  logMessage(`Novo membro detectado: ${name || phoneNumber}`, 'success');
                  console.log('[Black Phantom] Novo membro detectado:', name, phoneNumber);
                  
                  // Incrementar contador antes de enviar a mensagem
                  messagesSent++;
                  chrome.runtime.sendMessage({
                    action: 'updateBadge',
                    count: messagesSent
                  });
                  
                  // Enviar mensagem de boas-vindas
                  sendWelcomeMessage(phoneNumber, name);
                }
              }
            }
          }
        }
      }
    });
  });
  
  // Procurar e selecionar o container de mensagens do grupo atual usando vários seletores
  let chatContainer = null;
  
  // Explorar todos os seletores possíveis para o container de mensagens 
  console.log('[Black Phantom] Explorando seletores para encontrar o container de mensagens...');
  
  // Tentativa 1: Seletores específicos atualizados para 2024/2025
  const specificSelectors = [
    // Seletores atualizados para versões recentes do WhatsApp Web
    '[data-testid="conversation-panel-messages"]',
    '[data-testid="msg-container"]',
    '[role="application"] [role="region"]',
    '[data-testid="chatlist-panel"] + div [role="region"]',
    '#main [role="region"]',
    // Seletores para versão 2025
    '.copyable-area',
    '.conversation-panel__messages',
    '.message-list',
    '#main .top-background ~ div',
    '#main > div:nth-child(4)',
    // Seletores originais
    '#main div[data-testid="conversation-panel-messages"]',
    '#main div.message-list'
  ];
  
  for (const selector of specificSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      chatContainer = element;
      console.log('[Black Phantom] Container de mensagens encontrado usando seletor:', selector);
      break;
    }
  }
  
  // Tentativa 2: Procurar por elementos com muitas mensagens (filhos)
  if (!chatContainer) {
    console.log('[Black Phantom] Procurando por elementos com muitas mensagens (filhos)...');
    const possibleContainers = document.querySelectorAll('#main div');
    
    // Ordenar por número de filhos (do maior para o menor)
    const sortedContainers = Array.from(possibleContainers)
      .filter(el => el.children.length > 10)
      .sort((a, b) => b.children.length - a.children.length);
    
    if (sortedContainers.length > 0) {
      chatContainer = sortedContainers[0];
      console.log('[Black Phantom] Container encontrado por número de filhos:', chatContainer.children.length);
    }
  }
  
  // Tentativa 3: Procurar por scroll containers
  if (!chatContainer) {
    console.log('[Black Phantom] Procurando por scroll containers...');
    const scrollContainers = Array.from(document.querySelectorAll('#main div'))
      .filter(el => {
        const style = window.getComputedStyle(el);
        return (style.overflowY === 'auto' || style.overflowY === 'scroll') && 
               el.clientHeight > 300;
      });
    
    if (scrollContainers.length > 0) {
      chatContainer = scrollContainers[0];
      console.log('[Black Phantom] Container de scroll encontrado');
    }
  }
  
  // Tentativa 4: Última alternativa - usar o próprio #main
  if (!chatContainer) {
    chatContainer = document.querySelector('#main');
    console.log('[Black Phantom] Usando #main como último recurso');
  }
  
  if (chatContainer) {
    // Analisar e logar a estrutura do container para debug
    const numChildren = chatContainer.children ? chatContainer.children.length : 0;
    const classes = chatContainer.className || 'sem classes';
    const id = chatContainer.id || 'sem id';
    const dataAttrs = Array.from(chatContainer.attributes || [])
      .filter(attr => attr.name.startsWith('data-'))
      .map(attr => `${attr.name}="${attr.value}"`)
      .join(' ');
      
    console.log(`[Black Phantom] Detalhes do container: id=${id}, classes=${classes}, filhos=${numChildren}, data-attributes=[${dataAttrs}]`);
    
    // Configurar observer com opções mais completas
    observer.observe(chatContainer, { 
      childList: true, 
      subtree: true,
      characterData: true, 
      attributes: true, 
      attributeFilter: ['data-id', 'class', 'role']
    });
    
    logMessage(`Monitorando o grupo: ${selectedGroup} (${numChildren} mensagens encontradas)`, 'success');
    console.log('[Black Phantom] Monitoramento iniciado para o container:', chatContainer);
  } else {
    logMessage('Não foi possível localizar o container de mensagens do grupo', 'error');
    // Tentar uma abordagem mais agressiva - observar toda a página
    console.log('[Black Phantom] Tentando observar todo o conteúdo da página como último recurso');
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

// Função para enviar mensagem de boas-vindas
async function sendWelcomeMessage(phoneNumber, name) {
  try {
    logMessage(`Enviando mensagem para o número ${phoneNumber}...`, 'info');
    
    // Substituir variáveis no template da mensagem
    const personalizedMessage = welcomeMessage.replace(/\${name}/g, name);
    
    // Método 1: Tentar usar recursos avançados de busca
    // Abrir chat com o contato usando diferentes métodos
    let searchBox = null;
    
    // Tenta encontrar a barra de pesquisa usando diferentes seletores
    const searchSelectors = [
      'button[aria-label="Search text box"]',
      'button[aria-label="Caixa de texto de pesquisa"]',
      'div[data-testid="chat-list-search"]',
      '[data-testid="search"]',
      'button[aria-label*="Pesquisar"]',
      'button[aria-label*="Search"]',
      'div[role="button"][title*="Pesquisar"]',
      'div[role="button"][title*="Search"]',
      'svg[data-testid="search"]',
      '#side div[role="button"]'
    ];
    
    // Verificar se já estamos em um chat privado (para evitar pesquisar novamente)
    const headerTitle = document.querySelector('#main header span[title], #main header div[title]');
    if (headerTitle && headerTitle.textContent && 
        (headerTitle.textContent.includes(phoneNumber) || headerTitle.textContent.includes(name))) {
      logMessage(`Já estamos no chat com ${name || phoneNumber}`, 'info');
    } else {
      // Procurar botão de pesquisa
      for (const selector of searchSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          // Tentar encontrar o elemento de pesquisa procurando por ícones ou texto
          if (el.innerHTML.includes('search') || 
              el.innerHTML.includes('svg') || 
              (el.textContent && (el.textContent.includes('Pesquisar') || el.textContent.includes('Search')))) {
            searchBox = el;
            break;
          }
        }
        if (searchBox) break;
      }
      
      // Se ainda não encontrou, buscar elementos com conteúdo de texto relacionado a pesquisa
      if (!searchBox) {
        const possibleSearchBoxes = Array.from(document.querySelectorAll('div[role="button"], button'));
        searchBox = possibleSearchBoxes.find(el => 
          el.textContent && 
          (el.textContent.includes('Pesquisar') || el.textContent.includes('Search'))
        );
      }
      
      // Se não encontrou um botão específico, tentar clicar diretamente na área de pesquisa
      if (!searchBox) {
        searchBox = document.querySelector('#side [contenteditable="true"], #side input, #side .selectable-text');
      }
      
      if (!searchBox) {
        // Última tentativa: clicar em qualquer possível botão de pesquisa no painel lateral
        const sideButtons = document.querySelectorAll('#side button, #side div[role="button"]');
        for (const btn of sideButtons) {
          if (btn.querySelector('svg') || btn.querySelector('img')) {
            searchBox = btn;
            break;
          }
        }
      }
      
      if (!searchBox) {
        throw new Error('Barra de pesquisa não encontrada');
      }
      
      // Clica na barra de pesquisa
      searchBox.click();
      
      // Aguardar o campo de pesquisa aparecer
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Tentar encontrar o campo de pesquisa usando diferentes seletores
      let searchInput = null;
      const inputSelectors = [
        'div[data-testid="chat-list-search-input"]',
        'div[contenteditable="true"][data-tab="3"]',
        'div[contenteditable="true"]',
        'input[placeholder*="Pesquisar"]',
        'input[placeholder*="Search"]',
        '#side .selectable-text[contenteditable="true"]',
        '#side input[type="text"]'
      ];
      
      for (const selector of inputSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          searchInput = elements[0];
          break;
        }
      }
      
      if (!searchInput) {
        throw new Error('Campo de pesquisa não encontrado');
      }
      
      // Limpar qualquer texto existente
      searchInput.textContent = '';
      
      // Inserir número no campo de pesquisa (tentar diferentes métodos)
      try {
        // Método 1: Usar input event
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: phoneNumber
        });
        searchInput.textContent = phoneNumber;
        searchInput.dispatchEvent(inputEvent);
      } catch (e) {
        try {
          // Método 2: Simular digitação
          searchInput.focus();
          document.execCommand('insertText', false, phoneNumber);
        } catch (e2) {
          // Método 3: Definir o valor diretamente
          if (searchInput.tagName === 'INPUT') {
            searchInput.value = phoneNumber;
          } else {
            searchInput.textContent = phoneNumber;
          }
        }
      }
      
      // Aguardar resultados da pesquisa
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Tentar encontrar e clicar no primeiro resultado usando diferentes seletores
      let firstResult = null;
      
      // Método 1: Buscar itens que contenham o número/nome
      const possibleItems = document.querySelectorAll('#pane-side [role="row"], #side [role="row"]');
      for (const item of possibleItems) {
        if (item.textContent && 
            (item.textContent.includes(phoneNumber) || item.textContent.includes(name))) {
          firstResult = item;
          break;
        }
        
        // Tentar buscar título específico dentro do item
        const titleElements = item.querySelectorAll('span[title], div[title], span, div');
        for (const el of titleElements) {
          if ((el.title && (el.title.includes(phoneNumber) || el.title.includes(name))) ||
              (el.textContent && (el.textContent.includes(phoneNumber) || el.textContent.includes(name)))) {
            firstResult = item;
            break;
          }
        }
        
        if (firstResult) break;
      }
      
      // Método 2: Se não encontrou, tentar resultados da pesquisa
      if (!firstResult) {
        const resultSelectors = [
          'div[data-testid="cell-frame-container"]',
          'div[aria-label*="' + phoneNumber + '"]',
          '[data-testid="chat-list"] [role="row"]:first-child'
        ];
        
        for (const selector of resultSelectors) {
          const items = document.querySelectorAll(selector);
          if (items.length > 0) {
            firstResult = items[0];
            break;
          }
        }
      }
      
      // Método 3: Usar o primeiro resultado da pesquisa, independentemente do conteúdo
      if (!firstResult) {
        const anyResults = document.querySelectorAll('#pane-side [role="row"]:first-child, #side [role="row"]:first-child');
        if (anyResults.length > 0) {
          firstResult = anyResults[0];
          logMessage('Nenhum resultado exato encontrado, tentando usar o primeiro resultado disponível', 'warning');
        }
      }
      
      if (!firstResult) {
        throw new Error('Contato não encontrado nos resultados da pesquisa');
      }
      
      // Clicar no resultado encontrado
      firstResult.click();
      
      // Aguardar o carregamento do chat
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // Tentar encontrar o campo de mensagem usando diferentes seletores
    let messageInput = null;
    const messageInputSelectors = [
      'div[data-testid="conversation-compose-box-input"]',
      '[data-testid="conversation-compose-box"] div[contenteditable="true"]',
      'div[contenteditable="true"][data-tab="10"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[title="Digite uma mensagem"]',
      'div[title="Type a message"]',
      'footer div[contenteditable="true"]',
      '#main footer div[contenteditable="true"]',
      'div[contenteditable="true"]'
    ];
    
    for (const selector of messageInputSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        messageInput = elements[0];
        break;
      }
    }
    
    if (!messageInput) {
      throw new Error('Campo de mensagem não encontrado');
    }
    
    // Limpar qualquer texto existente
    messageInput.innerHTML = '';
    
    // Focar no campo de texto
    messageInput.focus();
    
    // Criar versão da mensagem sem formatação (como fallback)
    const plainText = personalizedMessage.replace(/\*/g, '').replace(/~/g, '').replace(/_/g, '');
    
    // Tentar vários métodos para inserir texto
    let textInserted = false;
    
    try {
      // Método 1: execCommand
      document.execCommand('insertHTML', false, personalizedMessage);
      textInserted = messageInput.textContent && messageInput.textContent.length > 0;
    } catch (e) { /* Continuar para o próximo método */ }
    
    if (!textInserted) {
      try {
        // Método 2: definir diretamente o innerHTML
        messageInput.innerHTML = personalizedMessage.replace(/\n/g, '<br>');
        textInserted = messageInput.textContent && messageInput.textContent.length > 0;
      } catch (e) { /* Continuar para o próximo método */ }
    }
    
    if (!textInserted) {
      try {
        // Método 3: usar eventos de teclado
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: plainText
        });
        messageInput.textContent = plainText;
        messageInput.dispatchEvent(inputEvent);
        textInserted = messageInput.textContent && messageInput.textContent.length > 0;
      } catch (e) { /* Continuar para o último método */ }
    }
    
    if (!textInserted) {
      // Método 4: Fallback final - texto simples sem formatação
      messageInput.textContent = plainText;
    }
    
    // Aguardar um momento
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Tentar encontrar o botão de envio com diferentes seletores
    let sendButton = null;
    const sendButtonSelectors = [
      'button[data-testid="compose-btn-send"]',
      '[data-icon="send"]',
      'button[aria-label="Enviar"]',
      'button[aria-label="Send"]',
      'span[data-icon="send"]',
      'span[data-testid="send"]',
      'button[data-tab="11"]'
    ];
    
    for (const selector of sendButtonSelectors) {
      sendButton = document.querySelector(selector);
      if (sendButton) break;
    }
    
    // Se não encontrou com seletores específicos, tenta encontrar por um ícone típico de envio
    if (!sendButton) {
      const buttons = document.querySelectorAll('button');
      for (const button of buttons) {
        if (button.innerHTML.includes('send') || 
            button.innerHTML.includes('plane') || 
            button.querySelector('svg') || 
            button.querySelector('path')) {
          sendButton = button;
          break;
        }
      }
    }
    
    // Última tentativa: pressionar Enter
    if (!sendButton) {
      logMessage('Botão de envio não encontrado, tentando usar Enter', 'warning');
      
      // Pressionar Enter no campo de mensagem
      const enterEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        keyCode: 13,
        which: 13,
        key: 'Enter'
      });
      
      messageInput.dispatchEvent(enterEvent);
    } else {
      // Clicar no botão de enviar
      sendButton.click();
    }
    
    // Registrar mensagem enviada
    messagesSent++;
    chrome.runtime.sendMessage({
      action: 'updateBadge',
      count: messagesSent
    });
    
    logMessage(`Mensagem enviada com sucesso para ${phoneNumber}!`, 'success');
    saveState();
    
    // Aguardar para garantir que a mensagem seja enviada
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Voltar ao grupo
    const groupSelected = await selectGroup();
    if (!groupSelected) {
      logMessage(`Aviso: Não foi possível voltar ao grupo ${selectedGroup} após enviar a mensagem`, 'warning');
    }
    
    return true;
  } catch (error) {
    logMessage(`Erro ao enviar mensagem para ${phoneNumber}: ${error.message}`, 'error');
    failedMessages.push({
      phoneNumber,
      name,
      timestamp: Date.now(),
      attempts: 1
    });
    
    saveState();
    return false;
  }
}

// Função para tentar reenviar mensagens que falharam
async function retryFailedMessages() {
  if (failedMessages.length === 0 || !isActive || isPaused) return;
  
  const message = failedMessages.shift();
  if (message && message.attempts < 3) {
    logMessage(`Tentando reenviar mensagem para ${message.phoneNumber} (Tentativa ${message.attempts + 1})`, 'info');
    
    // Incrementar o contador de tentativas
    message.attempts++;
    
    // Tentar enviar a mensagem
    const success = await sendWelcomeMessage(message.phoneNumber, message.name);
    
    // Se falhar novamente, adicionar de volta à lista com contador incrementado
    if (!success) {
      failedMessages.push(message);
    }
  } else if (message) {
    logMessage(`Desistindo após 3 tentativas para ${message.phoneNumber}`, 'error');
  }
  
  saveState();
}

// Função para selecionar um grupo
async function selectGroup() {
  if (!selectedGroup) return false;
  
  try {
    logMessage(`Tentando selecionar o grupo: ${selectedGroup}...`, 'info');
    
    // Método 1: Verificar se já estamos no grupo correto
    const headerSelectors = [
      'div[data-testid="conversation-info-header"] span[title]',
      'header span[title]',
      'header div[title]',
      '#main header span',
      '#main header [role="heading"]',
      '[data-testid="conversation-header"] span'
    ];
    
    for (const selector of headerSelectors) {
      const currentChatTitle = document.querySelector(selector);
      if (currentChatTitle && 
          (currentChatTitle.title === selectedGroup || 
           currentChatTitle.textContent.includes(selectedGroup))) {
        logMessage(`Já estamos no grupo "${selectedGroup}"`, 'info');
        return true;
      }
    }
    
    // Método 2: Tentar encontrar e clicar na barra de pesquisa
    let searchBox = null;
    
    // Tenta encontrar a barra de pesquisa usando diferentes seletores
    const searchSelectors = [
      'button[aria-label="Search text box"]',
      'button[aria-label="Caixa de texto de pesquisa"]',
      'div[data-testid="chat-list-search"]',
      '[data-testid="search"]',
      'button[aria-label*="Pesquisar"]',
      'button[aria-label*="Search"]',
      'div[role="button"][title*="Pesquisar"]',
      'div[role="button"][title*="Search"]',
      'svg[data-testid="search"]',
      '#side div[role="button"]'
    ];
    
    for (const selector of searchSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        // Tentar encontrar o elemento de pesquisa procurando por ícones ou texto
        if (el.innerHTML.includes('search') || 
            el.innerHTML.includes('svg') || 
            (el.textContent && (el.textContent.includes('Pesquisar') || el.textContent.includes('Search')))) {
          searchBox = el;
          break;
        }
      }
      if (searchBox) break;
    }
    
    // Se ainda não encontrou, buscar elementos com conteúdo de texto relacionado a pesquisa
    if (!searchBox) {
      const possibleSearchBoxes = Array.from(document.querySelectorAll('div[role="button"], button'));
      searchBox = possibleSearchBoxes.find(el => 
        el.textContent && 
        (el.textContent.includes('Pesquisar') || el.textContent.includes('Search'))
      );
    }
    
    // Se não encontrou um botão específico, tentar clicar diretamente na área de pesquisa
    if (!searchBox) {
      searchBox = document.querySelector('#side [contenteditable="true"], #side input, #side .selectable-text');
    }
    
    if (!searchBox) {
      // Última tentativa: clicar em qualquer possível botão de pesquisa no painel lateral
      const sideButtons = document.querySelectorAll('#side button, #side div[role="button"]');
      for (const btn of sideButtons) {
        if (btn.querySelector('svg') || btn.querySelector('img')) {
          searchBox = btn;
          break;
        }
      }
    }
    
    // Se ainda não encontrou, registra o erro mas tenta continuar
    if (!searchBox) {
      logMessage('Aviso: Barra de pesquisa não encontrada. Tentando método alternativo...', 'warning');
      // Continuar mesmo sem encontrar a barra de pesquisa
    } else {
      // Se encontrou, clica nela
      searchBox.click();
      
      // Aguardar o campo de pesquisa aparecer
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Tentar encontrar o campo de pesquisa usando diferentes seletores
    let searchInput = null;
    const inputSelectors = [
      'div[data-testid="chat-list-search-input"]',
      'div[contenteditable="true"][data-tab="3"]',
      'div[contenteditable="true"]',
      'input[placeholder*="Pesquisar"]',
      'input[placeholder*="Search"]',
      '#side .selectable-text[contenteditable="true"]',
      '#side input[type="text"]'
    ];
    
    for (const selector of inputSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        searchInput = elements[0];
        break;
      }
    }
    
    if (!searchInput) {
      logMessage('Campo de pesquisa não encontrado. Tentando método alternativo...', 'warning');
      
      // Tentar usar método de força bruta para encontrar todos os chats
      const allChats = document.querySelectorAll('#pane-side [role="row"], #side [role="row"]');
      for (const chat of allChats) {
        const titleElements = chat.querySelectorAll('span[title], [dir="auto"], span, div');
        for (const el of titleElements) {
          if (el.textContent && 
              (el.textContent.trim() === selectedGroup || 
               el.textContent.includes(selectedGroup))) {
            chat.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            logMessage(`Grupo "${selectedGroup}" possivelmente selecionado via método alternativo`, 'info');
            return true;
          }
        }
      }
      
      logMessage(`Falha ao encontrar grupo "${selectedGroup}" em todos os métodos`, 'error');
      return false;
    }
    
    // Limpar qualquer texto existente
    searchInput.textContent = '';
    
    // Inserir nome do grupo no campo de pesquisa
    try {
      // Método 1: Usar input event
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: selectedGroup
      });
      searchInput.textContent = selectedGroup;
      searchInput.dispatchEvent(inputEvent);
    } catch (e) {
      // Método 2: Simular digitação
      searchInput.focus();
      document.execCommand('insertText', false, selectedGroup);
    }
    
    // Aguardar resultados da pesquisa
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Tentar encontrar e clicar no resultado correto usando diferentes métodos
    let chatItem = null;
    
    // Método 1: Buscar por elemento que contenha o texto do grupo
    const possibleItems = document.querySelectorAll('#pane-side [role="row"], #side [role="row"]');
    for (const item of possibleItems) {
      const textContent = item.textContent || '';
      if (textContent.includes(selectedGroup)) {
        chatItem = item;
        break;
      }
      
      // Tentar buscar por títulos específicos dentro do item
      const titleEls = item.querySelectorAll('span[title], div[title], [dir="auto"]');
      for (const el of titleEls) {
        if (el.title === selectedGroup || 
            el.textContent.includes(selectedGroup)) {
          chatItem = item;
          break;
        }
      }
      
      if (chatItem) break;
    }
    
    // Se encontramos o item, clique nele
    if (chatItem) {
      chatItem.click();
      
      // Aguardar o carregamento do chat
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Verificar se o chat foi carregado corretamente
      const chatHeaders = document.querySelectorAll('#main header span[title], #main header div[title], #main header span, [data-testid="conversation-header"] span');
      let headerMatch = false;
      
      for (const header of chatHeaders) {
        if (header.title === selectedGroup || 
            header.textContent.includes(selectedGroup)) {
          headerMatch = true;
          break;
        }
      }
      
      if (headerMatch) {
        logMessage(`Grupo "${selectedGroup}" selecionado com sucesso`, 'success');
        return true;
      } else {
        logMessage(`Grupo selecionado, mas título não corresponde ao esperado. Continuando mesmo assim...`, 'warning');
        return true; // Ainda retornamos true porque um chat foi selecionado
      }
    } else {
      logMessage(`Grupo "${selectedGroup}" não encontrado. Verifique o nome exato do grupo.`, 'error');
      return false;
    }
  } catch (error) {
    logMessage(`Erro ao selecionar grupo: ${error.message}`, 'error');
    return false;
  }
}

// Função para salvar o estado atual
function saveState() {
  chrome.storage.local.set({
    selectedGroup,
    welcomeMessage,
    isActive,
    isPaused,
    messageLimit,
    messagesSent,
    messagesResponded,
    failedMessages
  });
}

// Função para carregar o estado salvo
function loadState() {
  chrome.storage.local.get([
    'selectedGroup',
    'welcomeMessage',
    'isActive',
    'isPaused',
    'messageLimit',
    'messagesSent',
    'messagesResponded',
    'failedMessages'
  ], (data) => {
    selectedGroup = data.selectedGroup || '';
    welcomeMessage = data.welcomeMessage || '';
    isActive = data.isActive || false;
    isPaused = data.isPaused || false;
    messageLimit = data.messageLimit || 100;
    messagesSent = data.messagesSent || 0;
    messagesResponded = data.messagesResponded || 0;
    failedMessages = data.failedMessages || [];
    
    // Se estava ativo anteriormente, tentar reiniciar monitoramento
    if (isActive && !isPaused && selectedGroup) {
      selectGroup().then(success => {
        if (success) {
          monitorGroup();
        }
      });
    }
  });
}

// Função para registrar mensagens de log
function logMessage(message, type = 'info') {
  console.log(`[Black Phantom] ${message}`);
  chrome.runtime.sendMessage({
    action: 'log',
    message,
    type
  });
}

// Ouvir mensagens do popup ou do painel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Log para debug
  console.log('[Black Phantom] Recebeu mensagem:', request.action);
  
  // Criar uma porta de comunicação para manter o service worker ativo
  try {
    const port = chrome.runtime.connect({name: "black-phantom-content"});
    port.onDisconnect.addListener(() => {
      console.log('[Black Phantom] Port disconnected from content script');
    });
  } catch (error) {
    console.error('[Black Phantom] Error connecting port:', error);
  }
  
  if (request.action === 'openPanel') {
    try {
      createPanel();
      sendResponse({success: true});
    } catch (error) {
      console.error('[Black Phantom] Error opening panel:', error);
      sendResponse({success: false, error: error.message});
    }
  }
  
  else if (request.action === 'closePanel') {
    try {
      hidePanel();
      sendResponse({success: true});
    } catch (error) {
      console.error('[Black Phantom] Error hiding panel:', error);
      sendResponse({success: false, error: error.message});
    }
  }
  
  // Métodos alternativos para iniciar
  else if (request.action === 'directStart') {
    try {
      console.log('[Black Phantom] Tentando iniciar diretamente com:', request);
      
      // Verificar se temos os dados necessários
      if (!request.selectedGroup) {
        sendResponse({success: false, error: 'Grupo não especificado'});
        return true;
      }
      
      // Definir valores diretamente
      selectedGroup = request.selectedGroup;
      welcomeMessage = request.welcomeMessage;
      messageLimit = request.messageLimit || 100;
      isActive = true;
      isPaused = false;
      
      // Salvar estado
      saveState();
      
      // Usar uma Promise com timeout para garantir que sempre respondemos
      const selectGroupPromise = selectGroup();
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => resolve({timeout: true}), 10000)
      );
      
      Promise.race([selectGroupPromise, timeoutPromise])
        .then(result => {
          if (result && result.timeout) {
            console.warn('[Black Phantom] Timeout ao selecionar grupo, mas continuando...');
            // Mesmo com timeout, tentar monitorar
            monitorGroup();
            sendResponse({
              success: true, 
              warning: 'Timeout ao selecionar grupo, mas o monitoramento foi iniciado'
            });
            return;
          }
          
          if (result) {
            monitorGroup();
            console.log('[Black Phantom] Iniciado com sucesso via directStart');
            sendResponse({success: true});
          } else {
            console.error('[Black Phantom] Falha ao selecionar grupo via directStart');
            sendResponse({success: false, error: 'Não foi possível selecionar o grupo'});
          }
        })
        .catch(error => {
          console.error('[Black Phantom] Erro em directStart:', error);
          // Mesmo com erro, tentar monitorar
          try {
            monitorGroup();
            sendResponse({
              success: true, 
              warning: `Erro ao selecionar grupo (${error.message}), mas o monitoramento foi iniciado`
            });
          } catch (monitorError) {
            sendResponse({success: false, error: error.message});
          }
        });
      
      return true;
    } catch (error) {
      console.error('[Black Phantom] Erro em directStart:', error);
      sendResponse({success: false, error: error.message});
      return true;
    }
  }
  
  else if (request.action === 'forceStart') {
    try {
      console.log('[Black Phantom] Tentando forceStart com grupo:', request.group);
      
      // Verificar se temos os dados necessários
      if (!request.group) {
        if (sendResponse) {
          sendResponse({success: false, error: 'Grupo não especificado'});
        }
        return true;
      }
      
      // Definir apenas o grupo, manter outros valores padrão
      selectedGroup = request.group;
      if (!welcomeMessage) {
        welcomeMessage = 'Olá *${name}*! 👋\nBem-vindo(a) ao nosso grupo!';
      }
      
      // Ativar diretamente
      isActive = true;
      isPaused = false;
      
      // Salvar o estado
      saveState();
      
      // Enviar mensagem de log
      logMessage(`Monitoramento iniciado para o grupo: ${selectedGroup}`);
      
      // Tentar selecionar o grupo e iniciar monitoramento com tratamento de erro
      setTimeout(() => {
        try {
          selectGroup().then(success => {
            if (success) {
              try {
                monitorGroup();
                if (sendResponse) {
                  sendResponse({success: true});
                }
              } catch (monitorError) {
                console.error('[Black Phantom] Erro ao monitorar grupo:', monitorError);
                if (sendResponse) {
                  sendResponse({success: false, error: monitorError.message});
                }
              }
            } else {
              if (sendResponse) {
                sendResponse({success: false, error: 'Não foi possível selecionar o grupo'});
              }
            }
          }).catch(error => {
            console.error('[Black Phantom] Erro ao selecionar grupo:', error);
            if (sendResponse) {
              sendResponse({success: false, error: error.message});
            }
          });
        } catch (error) {
          console.error('[Black Phantom] Erro ao iniciar seleção de grupo:', error);
          if (sendResponse) {
            sendResponse({success: false, error: error.message});
          }
        }
      }, 500);
      
      // Retornar true para indicar resposta assíncrona
      return true;
    } catch (error) {
      console.error('[Black Phantom] Erro em forceStart:', error);
      if (sendResponse) {
        sendResponse({success: false, error: error.message});
      }
      return true;
    }
  }
  
  else if (request.action === 'getState') {
    try {
      sendResponse({
        selectedGroup,
        welcomeMessage,
        isActive,
        isPaused,
        messageLimit,
        messagesSent,
        messagesResponded,
        failedMessages
      });
    } catch (error) {
      console.error('[Black Phantom] Erro ao obter estado:', error);
      sendResponse({success: false, error: error.message});
    }
  }
  
  else if (request.action === 'updateState') {
    try {
      if (request.selectedGroup !== undefined) selectedGroup = request.selectedGroup;
      if (request.welcomeMessage !== undefined) welcomeMessage = request.welcomeMessage;
      if (request.messageLimit !== undefined) messageLimit = request.messageLimit;
      
      saveState();
      sendResponse({success: true});
    } catch (error) {
      console.error('[Black Phantom] Erro ao atualizar estado:', error);
      sendResponse({success: false, error: error.message});
    }
  }
  
  else if (request.action === 'start') {
    try {
      // Verificar se o grupo e a mensagem estão definidos
      if (!selectedGroup) {
        sendResponse({success: false, error: 'Nenhum grupo selecionado'});
        return true;
      }
      
      if (!welcomeMessage) {
        sendResponse({success: false, error: 'Mensagem de boas-vindas não definida'});
        return true;
      }
      
      // Atualizar estado
      isActive = true;
      isPaused = false;
      saveState();
      
      // Log para debugging
      console.log('[Black Phantom] Tentando iniciar monitoramento do grupo:', selectedGroup);
      
      // Usar uma Promise com timeout
      const startPromise = new Promise((resolve, reject) => {
        selectGroup()
          .then(success => {
            if (success) {
              try {
                // Iniciar o monitoramento
                monitorGroup();
                console.log('[Black Phantom] Monitoramento iniciado com sucesso');
                resolve({success: true});
              } catch (monitorError) {
                console.error('[Black Phantom] Erro ao iniciar monitoramento:', monitorError);
                isActive = false;
                saveState();
                reject(new Error(`Erro ao iniciar monitoramento: ${monitorError.message}`));
              }
            } else {
              isActive = false;
              saveState();
              reject(new Error('Não foi possível selecionar o grupo'));
            }
          })
          .catch(error => {
            console.error('[Black Phantom] Erro ao selecionar grupo:', error);
            isActive = false;
            saveState();
            reject(new Error(`Erro ao selecionar grupo: ${error.message}`));
          });
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout ao iniciar monitoramento')), 10000)
      );
      
      Promise.race([startPromise, timeoutPromise])
        .then(result => {
          sendResponse(result);
        })
        .catch(error => {
          console.error('[Black Phantom] Erro ou timeout:', error);
          sendResponse({success: false, error: error.message});
        });
      
      // Precisamos retornar true para indicar que sendResponse será chamado assíncronamente
      return true;
    } catch (error) {
      console.error('[Black Phantom] Erro ao iniciar:', error);
      isActive = false;
      saveState();
      sendResponse({success: false, error: `Erro não tratado: ${error.message}`});
      return true;
    }
  }
  
  else if (request.action === 'pause') {
    try {
      isPaused = true;
      saveState();
      sendResponse({success: true});
    } catch (error) {
      console.error('[Black Phantom] Erro ao pausar:', error);
      sendResponse({success: false, error: error.message});
    }
  }
  
  else if (request.action === 'resume') {
    try {
      isPaused = false;
      saveState();
      monitorGroup();
      sendResponse({success: true});
    } catch (error) {
      console.error('[Black Phantom] Erro ao resumir:', error);
      sendResponse({success: false, error: error.message});
    }
  }
  
  else if (request.action === 'stop') {
    try {
      isActive = false;
      isPaused = false;
      saveState();
      sendResponse({success: true});
    } catch (error) {
      console.error('[Black Phantom] Erro ao parar:', error);
      sendResponse({success: false, error: error.message});
    }
  }
  
  else if (request.action === 'reset') {
    try {
      messagesSent = 0;
      messagesResponded = 0;
      failedMessages = [];
      saveState();
      sendResponse({success: true});
    } catch (error) {
      console.error('[Black Phantom] Erro ao resetar:', error);
      sendResponse({success: false, error: error.message});
    }
  }
  
  else if (request.action === 'getGroups') {
    try {
      // Forçar carregamento da lista de conversas
      const scrollContainer = document.querySelector('#pane-side');
      if (scrollContainer) {
        // Rolar para garantir que os chats sejam carregados
        const originalScrollTop = scrollContainer.scrollTop;
        
        // Implementar com Promises para melhor controle de erros
        const getGroupsPromise = new Promise((resolve) => {
          // Rolar para baixo
          scrollContainer.scrollTop = 9999;
          
          // Aguardar um momento e então rolar para cima
          setTimeout(() => {
            scrollContainer.scrollTop = 0;
            
            // Aguardar outro momento para coletar os grupos
            setTimeout(() => {
              // Restaurar posição original
              scrollContainer.scrollTop = originalScrollTop;
              
              // Depois de rolar, coletar grupos
              let chats = [];
              
              try {
                // Técnica 1: Obter todos os chats visíveis no painel lateral
                const allChats = document.querySelectorAll('#pane-side [role="row"]');
                if (allChats.length > 0) {
                  chats = Array.from(allChats)
                    .map(chat => {
                      // Buscar o título de diversas maneiras
                      const titleElement = 
                        chat.querySelector('[data-testid="cell-frame-title"]') || 
                        chat.querySelector('span[title]') || 
                        chat.querySelector('span[dir="auto"]');
                      
                      return titleElement ? titleElement.textContent.trim() : null;
                    })
                    .filter(chat => chat !== null);
                }
                
                // Técnica 2: Se o método anterior falhar
                if (chats.length === 0) {
                  const titleElements = document.querySelectorAll('span[title]');
                  chats = Array.from(titleElements)
                    .filter(el => el.title && el.title.trim() !== '' && !el.closest('[data-testid="status-v3-panel"]'))
                    .map(el => el.title);
                }
                
                // Técnica 3: Última tentativa
                if (chats.length === 0) {
                  const possibleChatRows = document.querySelectorAll('#pane-side div[style*="height"]');
                  chats = Array.from(possibleChatRows)
                    .map(row => {
                      const allTextElements = row.querySelectorAll('span, div');
                      for (const element of allTextElements) {
                        if (element.textContent && 
                            element.textContent.trim() !== '' && 
                            !element.textContent.match(/^(\d+:\d+|\d+\/\d+\/\d+)$/) && 
                            element.textContent.length < 30) {
                          return element.textContent.trim();
                        }
                      }
                      return null;
                    })
                    .filter(text => text !== null);
                }
                
                // Remover duplicatas
                chats = [...new Set(chats)];
                
                console.log('[Black Phantom] Grupos encontrados:', chats.length, chats);
                
                // Adicionar opção manual se não conseguir encontrar grupos
                if (chats.length === 0) {
                  chats = ['Exemplo - Grupo 1', 'Exemplo - Grupo 2', 'Digite o nome do grupo manualmente'];
                  logMessage('Não foi possível detectar grupos automaticamente. Adicionadas opções de exemplo.', 'warning');
                }
                
                resolve(chats);
              } catch (innerError) {
                console.error('[Black Phantom] Erro ao processar chats:', innerError);
                // Em caso de erro, retornar alguns exemplos
                resolve(['Exemplo - Grupo 1', 'Exemplo - Grupo 2', 'Digite o nome do grupo manualmente']);
              }
            }, 500);
          }, 500);
        });
        
        // Adicionar timeout para a promise
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            console.warn('[Black Phantom] Timeout ao obter grupos');
            resolve(['Exemplo - Grupo 1', 'Exemplo - Grupo 2', 'Digite o nome do grupo manualmente']);
          }, 5000);
        });
        
        // Corrida entre as promises
        Promise.race([getGroupsPromise, timeoutPromise])
          .then(chats => {
            sendResponse({groups: chats});
          })
          .catch(error => {
            console.error('[Black Phantom] Erro na promise de grupos:', error);
            sendResponse({
              groups: ['Exemplo - Grupo 1', 'Exemplo - Grupo 2', 'Digite o nome do grupo manualmente']
            });
          });
        
      } else {
        // Se não encontrar o painel lateral, retornar alguns exemplos
        console.warn('[Black Phantom] Painel lateral não encontrado');
        sendResponse({
          groups: ['Exemplo - Grupo 1', 'Exemplo - Grupo 2', 'Digite o nome do grupo manualmente']
        });
        logMessage('Não foi possível localizar o painel de conversas do WhatsApp', 'error');
      }
    } catch (error) {
      console.error('[Black Phantom] Erro ao obter grupos:', error);
      // Em caso de erro, retornar alguns exemplos de grupo
      sendResponse({
        groups: ['Exemplo - Grupo 1', 'Exemplo - Grupo 2', 'Digite o nome do grupo manualmente']
      });
      logMessage('Erro ao tentar obter lista de grupos: ' + error.message, 'error');
    }
    
    // Retornar true para indicar que a resposta será enviada assincronamente
    return true;
  }
  
  // Para qualquer outra ação, tentar garantir uma resposta
  else {
    console.warn('[Black Phantom] Ação desconhecida recebida:', request.action);
    sendResponse({success: false, error: 'Ação desconhecida: ' + request.action});
  }
  
  // Sempre retornar true quando usar sendResponse assincronamente
  return true;
});

// Carregar estado quando o script iniciar
loadState();

// Verificar mensagens falhas periodicamente
setInterval(retryFailedMessages, 60000); // Tentar a cada 1 minuto

// Verificar respostas às mensagens enviadas
setInterval(() => {
  if (!isActive) return;
  
  // Lógica para detectar respostas a mensagens enviadas
  // Esta é uma implementação simplificada, em uma versão real seria necessário
  // monitorar notificações de novas mensagens
  const unreadChats = document.querySelectorAll('span[data-testid="icon-unread-count"]');
  if (unreadChats.length > 0) {
    // Detectou novas mensagens não lidas
    messagesResponded++;
    saveState();
  }
}, 30000); // Verificar a cada 30 segundos
