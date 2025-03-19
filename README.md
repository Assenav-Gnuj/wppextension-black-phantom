# Black Phantom - Google Chrome Whatsapp Web Extension

![Black Phantom Logo](images/phantom.png)

Uma extensão para o Chrome que monitora grupos do WhatsApp Web e envia mensagens de boas-vindas automaticamente para novos membros.

## 📋 Descrição

Black Phantom é uma extensão desenvolvida pela equipe Phantom Thieves que automatiza o processo de boas-vindas em grupos do WhatsApp Web. A extensão detecta quando novos membros são adicionados a um grupo e envia automaticamente uma mensagem personalizada de boas-vindas, ajudando administradores a gerenciar seus grupos de forma mais eficiente.

## ✨ Funcionalidades

- **Monitoramento Automático**: Detecta em tempo real novos membros adicionados aos grupos do WhatsApp Web.
- **Mensagens Personalizadas**: Envie mensagens de boas-vindas personalizadas com suporte a formatação (negrito, itálico, tachado), emojis e variáveis como o nome do novo membro.
- **Painel de Controle**: Interface intuitiva para gerenciar configurações e monitorar atividades.
- **Estatísticas e Controle**: Acompanhe o número de mensagens enviadas, respostas recebidas e defina limites de envio.
- **Histórico de Logs**: Mantenha um registro detalhado de todas as atividades, incluindo novos membros e mensagens enviadas.

## 🔧 Instalação

### Método 1: Instalação via Chrome Web Store (Recomendado)

1. Acesse a [Chrome Web Store](https://chrome.google.com/webstore)
2. Pesquise por "Black Phantom WhatsApp"
3. Clique em "Adicionar ao Chrome"
4. Confirme a instalação quando solicitado

### Método 2: Instalação Manual (Modo Desenvolvedor)

1. Faça o download do código-fonte da extensão (clone este repositório ou baixe como ZIP)
2. Extraia os arquivos para uma pasta em seu computador
3. Abra o Chrome e acesse `chrome://extensions/`
4. Ative o "Modo do desenvolvedor" no canto superior direito
5. Clique em "Carregar sem compactação" e selecione a pasta onde você extraiu os arquivos
6. A extensão será instalada e aparecerá na barra de ferramentas do Chrome

## 🚀 Como Usar

1. **Acesse o WhatsApp Web**: Abra o [WhatsApp Web](https://web.whatsapp.com/) e faça login com seu celular
2. **Abra a Extensão**: Clique no ícone da extensão Black Phantom na barra de ferramentas do Chrome
3. **Acesse o Painel de Controle**: Clique em "Abrir Painel de Controle"
4. **Configure a Extensão**:
   - Selecione o grupo que deseja monitorar
   - Personalize a mensagem de boas-vindas (você pode usar `${name}` para incluir o nome do novo membro)
   - Defina um limite de mensagens (opcional)
5. **Inicie o Monitoramento**: Clique em "Iniciar Monitoramento"
6. **Pronto!** A extensão agora monitorará automaticamente o grupo selecionado e enviará mensagens de boas-vindas para novos membros

## 📝 Personalização de Mensagens

Você pode personalizar suas mensagens de boas-vindas usando:

- **Formatação**: 
  - `*texto*` para **negrito**
  - `_texto_` para _itálico_
  - `~texto~` para ~~tachado~~
- **Variáveis**:
  - `${name}` será substituído pelo nome do novo membro

### Exemplo de Mensagem:

```
Olá *${name}*! 👋
Bem-vindo(a) ao nosso grupo!
```

## ⚠️ Termos de Uso

- A extensão deve ser usada em conformidade com as políticas do WhatsApp e a LGPD (Lei Geral de Proteção de Dados)
- O usuário é responsável pelo uso da extensão e deve respeitar as diretrizes do WhatsApp
- A extensão não coleta, armazena ou compartilha dados pessoais
- O uso da extensão para spam, assédio ou atividades prejudiciais é estritamente proibido

Para mais informações sobre os termos de uso, consulte a página "Sobre" da extensão.

## 🔒 Privacidade

Black Phantom opera localmente em seu navegador e não envia dados para servidores externos. A extensão:

- Não coleta informações pessoais dos usuários
- Não armazena mensagens ou conversas
- Não compartilha dados com terceiros
- Requer apenas as permissões necessárias para seu funcionamento

## 🛠️ Solução de Problemas

### A extensão não detecta novos membros

- Certifique-se de que o WhatsApp Web está aberto e você está logado
- Verifique se você selecionou o grupo correto
- Tente recarregar a página do WhatsApp Web
- Reinicie a extensão desativando e ativando o monitoramento

### Mensagens não estão sendo enviadas

- Verifique sua conexão com a internet
- Certifique-se de que o WhatsApp Web está funcionando corretamente
- Verifique se você não atingiu o limite de mensagens definido

### A extensão não aparece ou não funciona

- Verifique se a extensão está instalada e ativada em `chrome://extensions/`
- Tente reinstalar a extensão
- Certifique-se de que seu navegador está atualizado

## 📄 Licença

Este projeto está licenciado sob a [Licença MIT](LICENSE) - veja o arquivo LICENSE para mais detalhes.

## 👥 Equipe

Desenvolvido pela equipe **Phantom Thieves** © 2025

---

**Nota**: Black Phantom não é afiliado, patrocinado ou endossado pelo WhatsApp Inc.
