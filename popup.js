document.addEventListener('DOMContentLoaded', function() {
  const statusEl = document.getElementById('status');
  const openPanelBtn = document.getElementById('openPanel');
  const aboutBtn = document.getElementById('aboutBtn');
  
  // Verificar se precisamos de permissões
  checkPermissions();
  
  // Verificar o status do WhatsApp Web
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    
    // Enviar verificação para o background.js
    chrome.runtime.sendMessage({action: 'checkTab'}, function(response) {
      const isWhatsAppWeb = response && response.isWhatsAppWeb;
      
      if (currentTab && currentTab.url && currentTab.url.includes('web.whatsapp.com')) {
        statusEl.textContent = 'Conectado';
        statusEl.style.color = '#9ECE6A'; // Verde
        
        openPanelBtn.addEventListener('click', function() {
          chrome.tabs.sendMessage(currentTab.id, {action: 'openPanel'});
        });
      } else {
        statusEl.textContent = 'Desconectado';
        statusEl.style.color = '#F7768E'; // Vermelho
        
        openPanelBtn.addEventListener('click', function() {
          chrome.tabs.create({url: 'https://web.whatsapp.com'});
        });
      }
    });
  });

  aboutBtn.addEventListener('click', function() {
    chrome.tabs.create({url: 'about.html'});
  });
  
  // Função para verificar e solicitar permissões necessárias
  function checkPermissions() {
    chrome.storage.local.get('pendingPermissions', function(data) {
      if (data.pendingPermissions) {
        // Criar botão de permissões se necessário
        const permissionBtn = document.createElement('button');
        permissionBtn.className = 'permission-btn';
        permissionBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Conceder Permissões';
        permissionBtn.style.display = 'block';
        permissionBtn.style.width = '100%';
        permissionBtn.style.padding = '8px';
        permissionBtn.style.marginTop = '10px';
        permissionBtn.style.backgroundColor = '#BB9AF7';
        permissionBtn.style.color = '#1A1B26';
        permissionBtn.style.border = 'none';
        permissionBtn.style.borderRadius = '4px';
        permissionBtn.style.cursor = 'pointer';
        
        permissionBtn.addEventListener('click', function() {
          chrome.runtime.sendMessage({action: 'requestPermissions'}, function(response) {
            if (response && response.success) {
              chrome.storage.local.set({pendingPermissions: false});
              permissionBtn.style.backgroundColor = '#9ECE6A';
              permissionBtn.textContent = 'Permissões concedidas!';
              setTimeout(function() {
                permissionBtn.style.display = 'none';
              }, 2000);
            }
          });
        });
        
        // Adicionar botão ao popup
        document.body.appendChild(permissionBtn);
      }
    });
  }
});
