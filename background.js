// Service Worker para a extensão Black Phantom
console.log('[Black Phantom] Service Worker initializing...');

// Inicializar configurações padrão quando a extensão é instalada
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Black Phantom] Extension installed');
  
  // Inicializar configurações padrão
  chrome.storage.local.set({
    selectedGroup: '',
    welcomeMessage: 'Olá *${name}*! 👋\nBem-vindo(a) ao nosso grupo!',
    messagesSent: 0,
    messagesResponded: 0,
    isActive: false,
    isPaused: false,
    messageLimit: 100,
    logs: []
  }, () => {
    console.log('[Black Phantom] Default settings initialized');
  });
  
  // Verificar permissões necessárias
  checkPermissions();
});

// Função para verificar e solicitar permissões
function checkPermissions() {
  console.log('[Black Phantom] Checking permissions');
  chrome.permissions.contains({
    permissions: ['notifications', 'activeTab']
  }, (hasPermissions) => {
    if (!hasPermissions) {
      console.log('[Black Phantom] Requesting permissions');
      // Criar notificação para o usuário conceder permissões
      try {
        chrome.notifications.create('permissions-request', {
          type: 'basic',
          iconUrl: 'images/phantom.png',
          title: 'Black Phantom - Permissões Necessárias',
          message: 'A extensão precisa de permissões adicionais para funcionar corretamente. Clique para conceder.',
          priority: 2,
          buttons: [
            { title: 'Conceder Permissões' }
          ]
        }, (notificationId) => {
          // Armazenar que estamos aguardando permissões
          chrome.storage.local.set({ pendingPermissions: true });
        });
      } catch (error) {
        console.error('[Black Phantom] Error creating notification:', error);
        // Se não conseguir mostrar notificação, marcar para pedir permissão via popup
        chrome.storage.local.set({ pendingPermissions: true });
      }
    } else {
      console.log('[Black Phantom] Required permissions already granted');
    }
  });
}

// Mensagem de debug para confirmar inicialização
console.log('[Black Phantom] Background service worker ready');

// Lidar com mensagens do content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Black Phantom] Received message:', message.action);
  
  // Tratador para a ação updateBadge
  if (message.action === 'updateBadge') {
    // Atualizar o contador do ícone da extensão
    try {
      chrome.action.setBadgeText({
        text: message.count.toString(),
        tabId: sender.tab ? sender.tab.id : null
      });
      chrome.action.setBadgeBackgroundColor({
        color: '#BB9AF7',
        tabId: sender.tab ? sender.tab.id : null
      });
      // Para ações síncronas, envie a resposta imediatamente
      sendResponse({ success: true });
    } catch (error) {
      console.error('[Black Phantom] Error updating badge:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  // Tratador para a ação log
  else if (message.action === 'log') {
    // Armazenar log
    try {
      chrome.storage.local.get('logs', (data) => {
        try {
          let logs = data.logs || [];
          const timestamp = new Date().toLocaleTimeString();
          logs.unshift({
            time: timestamp,
            message: message.message,
            type: message.type || 'info'
          });
          
          // Limitar a 1000 logs
          if (logs.length > 1000) {
            logs = logs.slice(0, 1000);
          }
          
          chrome.storage.local.set({logs: logs}, () => {
            // Sempre chamar sendResponse, mesmo que o remetente não esteja esperando
            try {
              sendResponse({ success: true });
            } catch (e) {
              console.warn('[Black Phantom] Could not send response for log action:', e);
            }
          });
          
          // Mostrar notificação para eventos importantes
          if (message.type === 'success' && message.message.includes('novo membro')) {
            try {
              chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/phantom.png',
                title: 'Black Phantom - Novo Membro',
                message: message.message,
                priority: 1
              });
            } catch (notifError) {
              console.error('[Black Phantom] Error creating notification:', notifError);
            }
          }
        } catch (innerError) {
          console.error('[Black Phantom] Inner error processing log:', innerError);
          try {
            sendResponse({ success: false, error: innerError.message });
          } catch (e) {
            console.warn('[Black Phantom] Could not send error response for log action:', e);
          }
        }
      });
      return true; // Indica que a resposta será enviada assincronamente
    } catch (error) {
      console.error('[Black Phantom] Error processing log:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  // Tratador para a ação requestPermissions
  else if (message.action === 'requestPermissions') {
    // Solicitar permissões quando o usuário clicar no botão
    console.log('[Black Phantom] Requesting permissions from user click');
    try {
      chrome.permissions.request({
        permissions: ['notifications', 'activeTab']
      }, (granted) => {
        console.log('[Black Phantom] Permissions granted:', granted);
        // Atualizar o status das permissões no storage
        if (granted) {
          chrome.storage.local.set({ pendingPermissions: false });
        }
        sendResponse({ success: granted });
      });
      return true; // Indica que a resposta será enviada assincronamente
    } catch (error) {
      console.error('[Black Phantom] Error requesting permissions:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  // Tratador para a ação checkTab
  else if (message.action === 'checkTab') {
    // Verificar se estamos em uma tab do WhatsApp Web
    try {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const isWhatsAppWeb = tabs.length > 0 && tabs[0].url && tabs[0].url.includes('web.whatsapp.com');
        console.log('[Black Phantom] Tab check:', isWhatsAppWeb);
        sendResponse({ isWhatsAppWeb: isWhatsAppWeb });
      });
      return true; // Indica que a resposta será enviada assincronamente
    } catch (error) {
      console.error('[Black Phantom] Error checking tab:', error);
      sendResponse({ isWhatsAppWeb: false, error: error.message });
    }
  }
  
  // Tratador para pegar as configurações atuais
  else if (message.action === 'getSettings') {
    try {
      chrome.storage.local.get([
        'selectedGroup',
        'welcomeMessage',
        'messageLimit',
        'isActive',
        'isPaused'
      ], (data) => {
        sendResponse({
          success: true,
          settings: data
        });
      });
      return true;
    } catch (error) {
      console.error('[Black Phantom] Error getting settings:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  // Tratador para salvar configurações
  else if (message.action === 'saveSettings') {
    try {
      // Validar os dados recebidos
      const settings = message.settings || {};
      
      // Verificar especificamente se messageLimit é um número
      if (settings.messageLimit !== undefined && isNaN(parseInt(settings.messageLimit))) {
        console.error('[Black Phantom] Invalid message limit:', settings.messageLimit);
        settings.messageLimit = 100; // Definir um valor padrão se for inválido
      } else if (settings.messageLimit !== undefined) {
        settings.messageLimit = parseInt(settings.messageLimit);
      }
      
      // Salvar as configurações
      chrome.storage.local.set(settings, () => {
        console.log('[Black Phantom] Settings saved:', settings);
        sendResponse({ success: true });
      });
      return true;
    } catch (error) {
      console.error('[Black Phantom] Error saving settings:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  // Para outras mensagens, garantir que o chamador saiba que fomos nós que lidamos com a mensagem
  else {
    // Enviar uma resposta padrão para mensagens desconhecidas para evitar que o canal fique aberto
    console.warn('[Black Phantom] Unknown message action:', message.action);
    sendResponse({ success: false, error: 'Unknown message action: ' + message.action });
  }
  
  // Retornar true para todas as mensagens para indicar que lidamos com elas
  return true;
});

// Ouvir cliques em notificações
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  console.log('[Black Phantom] Notification button clicked:', notificationId, buttonIndex);
  
  if (notificationId === 'permissions-request') {
    chrome.permissions.request({
      permissions: ['notifications', 'activeTab']
    }, (granted) => {
      console.log('[Black Phantom] Permissions granted from notification:', granted);
      
      if (granted) {
        chrome.storage.local.set({ pendingPermissions: false }, () => {
          console.log('[Black Phantom] Updated pendingPermissions to false');
        });
        
        // Mostrar notificação de sucesso
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/phantom.png',
          title: 'Black Phantom - Permissões Concedidas',
          message: 'A extensão está configurada e pronta para uso!',
          priority: 0
        });
      }
    });
  }
});

// Manter o service worker ativo
chrome.runtime.onConnect.addListener(function(port) {
  console.log('[Black Phantom] Port connected:', port.name);
  
  // Estabelecer um intervalo para manter o worker vivo
  const keepAliveInterval = setInterval(() => {
    if (port) {
      try {
        port.postMessage({ type: 'keepAlive' });
      } catch (e) {
        console.log('[Black Phantom] Port connection lost');
        clearInterval(keepAliveInterval);
      }
    }
  }, 25000); // A cada 25 segundos
  
  // Limpar o intervalo quando a porta for desconectada
  port.onDisconnect.addListener(function() {
    console.log('[Black Phantom] Port disconnected:', port.name);
    clearInterval(keepAliveInterval);
  });
});
