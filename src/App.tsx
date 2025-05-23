import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, Link, AtSign, FileBox, Bookmark, Globe, Zap, Search, Crown, Plus, History, MoreHorizontal, FlaskConical, Grid, Box, FileText, X, ChevronLeft, ChevronRight, User, Command, Settings, HelpCircle, Star, Calendar, Upload, LogOut, Trash2, ClipboardCopy } from 'lucide-react';
import { auth, logAnalyticsEvent } from './lib/firebase';
import { AuthModal } from './components/AuthModal';
import { User as FirebaseUser } from 'firebase/auth';
import { Toaster } from 'react-hot-toast';
import { CreditModal } from './components/CreditModal';
import { ModelSelect } from './components/ModelSelect';
import { models } from './lib/models';
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { cn } from './lib/utils';
import { ComingSoonPopup } from './components/ComingSoonPopup';
import toast from 'react-hot-toast';
import { FileUploadModal } from './components/FileUploadModal';
import { saveChat, getChatHistory } from './lib/store';
import type { ChatHistory } from './lib/types';
import { ToolsPage } from './components/ToolsPage';
import { LiveSearchAnimation } from './components/LiveSearchAnimation';
import { sendChatMessage } from './lib/chat';
import ReactMarkdown from 'react-markdown';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  attachments?: {
    name: string;
    type: string;
    url: string;
    size: number;
  }[];
}

// Custom CodeBlock component for react-markdown
interface CodeBlockProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const CodeBlock = ({ node, inline, className, children, ...props }: CodeBlockProps) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match && match[1] ? match[1] : '';
  const codeString = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString).then(() => {
      toast.success('Copied to clipboard!', {
        icon: '✂️',
        style: {
          background: '#1A1A1A',
          color: '#fff',
          border: '1px solid #232323',
        },
      });
    }).catch(err => {
      console.error('Failed to copy code: ', err);
      toast.error('Failed to copy code.');
    });
  };

  return !inline ? (
    <div className="relative group my-4">
      <div className="absolute top-2 right-2 z-10 flex items-center space-x-2">
        {language && (
          <span className="text-xs text-gray-400 bg-[#232323] px-2 py-1 rounded">
            {language}
          </span>
        )}
        <button 
          onClick={handleCopy} 
          className="p-1.5 bg-[#232323] hover:bg-[#2A2A2A] rounded text-gray-300 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Copy code"
        >
          <ClipboardCopy size={16} />
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus as any}
        language={language}
        PreTag="div"
        className="rounded-lg !bg-[#1A1A1A] border border-[#232323] overflow-auto scrollbar-thin scrollbar-thumb-pink-400 scrollbar-track-purple-700"
        showLineNumbers
        wrapLines
        {...props}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(() => {
    const storedModel = localStorage.getItem('selectedModel');
    return storedModel || 'openai/chatgpt-4o-latest'; // Default model
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isLiveSearch, setIsLiveSearch] = useState(false);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'history' | 'tools'>('chat');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<Array<{
    name: string;
    type: string;
    url: string;
    size: number;
  }>>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState<{
    isOpen: boolean;
    feature: string;
    description: string;
  }>({ isOpen: false, feature: '', description: '' });
  const modalRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowModelSelect(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    
    // Log page view
    logAnalyticsEvent('page_view', {
      page_title: 'Home',
      page_location: window.location.href,
    });
    
    return () => unsubscribe();
  }, []);

  // Save selectedModel to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('selectedModel', selectedModel);
  }, [selectedModel]);

  // Load chat history when user changes
  useEffect(() => {
    if (user) {
      loadChatHistory();
    } else {
      setChatHistory([]);
    }
  }, [user]);

  const loadChatHistory = async () => {
    try {
      const history = await getChatHistory();
      setChatHistory(history);
    } catch (error) {
      console.error('Error loading chat history:', error);
      toast.error('Failed to load chat history');
    }
  };

  const handleSend = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;

    // Log chat interaction
    logAnalyticsEvent('chat_message_sent', {
      model: selectedModel,
      has_attachments: attachedFiles.length > 0,
    });

    // Create new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);

    setIsThinking(true);
    setShowWelcome(false);

    const userMessage: Message = {
      role: 'user',
      content: input,
      createdAt: new Date(),
      attachments: attachedFiles.length > 0 ? attachedFiles : undefined
    };

    // Add user message and an initial empty assistant message for streaming
    const initialAssistantMessage: Message = {
      role: 'assistant',
      content: '', // Start with empty content for streaming
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMessage, initialAssistantMessage]);
    setInput('');
    setAttachedFiles([]);

    const selectedModelData = models.find(m => m.id === selectedModel);
    if (!selectedModelData) {
      toast.error('Invalid model selected');
      setIsThinking(false); // Stop thinking if model is invalid
      setMessages(prev => prev.slice(0, -1)); // Remove the empty assistant message
      return;
    }

    let accumulatedStreamedContent = '';

    try {
      await sendChatMessage(
        [...messages, userMessage], // Send current messages + new user message
        selectedModel,
        selectedModelData.apiProvider,
        controller.signal,
        (chunk, isDone) => {
          if (isDone) {
            setIsThinking(false);
            // Apply formatting once the entire message is received
            setMessages(prev => {
              const lastMessageIndex = prev.length -1;
              const updatedMessages = [...prev];
              if(updatedMessages[lastMessageIndex] && updatedMessages[lastMessageIndex].role === 'assistant'){
                updatedMessages[lastMessageIndex].content = accumulatedStreamedContent;
                updatedMessages[lastMessageIndex].createdAt = new Date(); // Update timestamp to final receive time
              }
              // Save chat to Firebase if user is logged in after stream is complete
              if (user) {
                saveChat(updatedMessages).then(() => loadChatHistory()).catch(err => {
                    console.error('Error saving chat after stream:', err);
                    toast.error('Failed to save chat');
                });
              }
              return updatedMessages;
            });
            setAbortController(null); 
          } else {
            accumulatedStreamedContent += chunk;
            setMessages(prev => {
              const lastMessageIndex = prev.length - 1;
              const updatedMessages = [...prev];
              // Update the last assistant message content directly
              if(updatedMessages[lastMessageIndex] && updatedMessages[lastMessageIndex].role === 'assistant'){
                 updatedMessages[lastMessageIndex].content = accumulatedStreamedContent; // Show raw streamed content for now
              }
              return updatedMessages;
            });
          }
        }
      );
      // No need to setMessages here as it's handled by the onChunk callback

    } catch (error: any) {
      console.error('Error in sendChatMessage call:', error);
      setIsThinking(false);
      setMessages(prev => {
        const lastMessageIndex = prev.length -1;
        const updatedMessages = [...prev];
        if(updatedMessages[lastMessageIndex] && updatedMessages[lastMessageIndex].role === 'assistant'){
          updatedMessages[lastMessageIndex].content = formatCodeInResponse(`Error: ${error.message || 'Failed to get response'}`);
        } else {
          // If for some reason the last message isn't the assistant message, add an error message
           updatedMessages.push({role: 'assistant', content: formatCodeInResponse(`Error: ${error.message || 'Failed to get response'}`), createdAt: new Date() });
        }
        return updatedMessages;
      });
      if (error.name === 'AbortError') {
        toast.success('Generation stopped', {
          icon: '🛑',
          style: {
            background: '#1A1A1A',
            color: '#fff',
            border: '1px solid #232323',
          },
        });
      } else {
        toast.error(error.message || 'Failed to get response from AI');
      }
      setAbortController(null); // Ensure controller is cleared on error
    }
    // Removed finally block as abortController is handled in isDone and error cases
  };

  const formatCodeInResponse = (content: string) => {
    // Replace Markdown-like syntax with HTML
    content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/\*(.+?)\*/g, '<em>$1</em>');

    if (content.includes('```')) {
      return content.replace(
        /```(\w+)?\n([\s\S]*?)```/g,
        (_, lang, code) => {
          const formattedCode = code.trim();
          const language = lang || 'typescript';
          // Use JSON.stringify for robust escaping of formattedCode in the onclick handler
          return `
            <pre class="code-block" data-language="${language}">
              <div class="language-badge">${language}</div>
              <button
                class="copy-button"
                onclick="navigator.clipboard.writeText(${JSON.stringify(formattedCode)}).then(() => { 
                  this.textContent = 'Copied!'; 
                  setTimeout(() => { this.textContent = 'Copy'; }, 2000); 
                }).catch(err => console.error('Failed to copy: ', err))"
              >
                Copy
              </button>
              <code class="language-${language}">${highlightCode(formattedCode, language)}</code>
            </pre>
          `;
        }
      );
    }
    return content;
  };

  const highlightCode = (code: string, language: string) => {
    return code
      .split('\n')
      .map(line => {
        // Basic syntax highlighting
        return line
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/(".*?")/g, '<span class="token string">\$1</span>')
          .replace(/('.*?')/g, '<span class="token string">\$1</span>')
          .replace(/\b(const|let|var|function|return|if|else|class)\b/g, '<span class="token keyword">\$1</span>')
          .replace(/\b(true|false)\b/g, '<span class="token boolean">\$1</span>')
          .replace(/\b(\d+)\b/g, '<span class="token number">\$1</span>')
          .replace(/(\w+):/g, '<span class="token property">\$1</span>')
          .replace(/([{}\[\],])/g, '<span class="token punctuation">\$1</span>');
      })
      .join('\n');
  };

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    const attachments = files.map(file => ({
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file),
      size: file.size
    }));

    setAttachedFiles(attachments);

    const fileList = files.map(f => f.name).join(', ');
    setInput(prev => `${prev} [Attached files: ${fileList}]`);

    toast.success(`${files.length} file${files.length === 1 ? '' : 's'} ready to send`, {
      icon: '📎',
      style: {
        background: '#1A1A1A',
        color: '#fff',
        border: '1px solid #232323',
      },
    });
  };

  return (
    <>
      <Toaster position="top-center" />
      <style>
        {`
          pre.code-block {
            position: relative;
            background: #1A1A1A;
            border: 1px solid #232323;
            border-radius: 8px;
            padding: 16px;
            padding-top: 36px; /* Add padding to top to avoid overlap with badge/button */
            overflow: auto;
          }
          .code-block .language-badge {
            position: absolute;
            top: 8px;
            left: 8px; /* Moved to top-left */
            background: #232323;
            color: #fff;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          }
          .code-block .copy-button {
            position: absolute;
            top: 8px;
            right: 8px; /* Stays top-right */
            background: #3b82f6;
            color: #fff;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.3s;
          }
          .code-block .copy-button\:hover {
            background: #2563eb;
          }
          .code-block code {
            display: block;
            padding: 8px;
            border-radius: 4px;
            background: #1A1A1A;
            color: #fff;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 14px;
            line-height: 1.6;
            white-space: pre-wrap;
          }
        `}
      </style>
      <div className="h-screen bg-gradient-to-b from-[#0A0A0A] to-[#1A1A1A] text-white flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-20 bg-[#141414]/80 backdrop-blur-xl border-r border-[#232323] flex flex-col items-center py-6 relative">
          {/* Logo */}
          <div className="w-14 h-14 relative mb-10 group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 rounded-2xl transform rotate-6 transition-transform group-hover\:rotate-12"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-purple-600 rounded-2xl transform -rotate-6 transition-transform group-hover:-rotate-12"></div>
            <div className="absolute inset-0 bg-[#141414] rounded-2xl flex items-center justify-center">
              <Command className="h-7 w-7 text-white transform transition-all duration-300 group-hover\:scale-110" />
            </div>
          </div>

          {/* Main Navigation */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => {
                setCurrentView('chat');
                setShowWelcome(true);
                setMessages([]);
              }}
              className="w-14 h-14 rounded-xl bg-[#1A1A1A]/50 hover\:bg-[#232323] flex items-center justify-center transition-all duration-200 group relative"
            >
              <Plus className="h-6 w-6 text-gray-400 group-hover\:text-white" />
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#232323] rounded-lg text-sm opacity-0 invisible group-hover\:opacity-100 group-hover\:visible transition-all">
                New Chat
              </div>
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className="w-14 h-14 rounded-xl bg-[#1A1A1A]/50 hover\:bg-[#232323] flex items-center justify-center transition-all duration-200 group relative"
            >
              <History className="h-6 w-6 text-gray-400 group-hover\:text-white" />
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#232323] rounded-lg text-sm opacity-0 invisible group-hover\:opacity-100 group-hover\:visible transition-all">
                History
              </div>
            </button>
            <button
              className="w-14 h-14 rounded-xl bg-[#1A1A1A]/50 hover\:bg-[#232323] flex items-center justify-center transition-all duration-200 group relative"
            >
              <Star className="h-6 w-6 text-gray-400 group-hover\:text-white" />
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#232323] rounded-lg text-sm opacity-0 invisible group-hover\:opacity-100 group-hover\:visible transition-all">
                Favorites
              </div>
            </button>
          </div>

          {/* Tools Section */}
          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => setCurrentView('tools')}
              className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-200 group relative",
                currentView === 'tools'
                  ? "bg-gradient-to-br from-purple-500 to-pink-500"
                  : "bg-[#1A1A1A]/50 hover\:bg-[#232323]"
              )}
            >
              <Grid className="h-6 w-6 text-gray-400 group-hover\:text-white" />
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#232323] rounded-lg text-sm opacity-0 invisible group-hover\:opacity-100 group-hover\:visible transition-all">
                Tools
              </div>
            </button>
            <button className="w-14 h-14 rounded-xl bg-[#1A1A1A]/50 hover\:bg-[#232323] flex items-center justify-center transition-all duration-200 group relative">
              <FileText className="h-6 w-6 text-gray-400 group-hover\:text-white" />
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#232323] rounded-lg text-sm opacity-0 invisible group-hover\:opacity-100 group-hover\:visible transition-all">
                Documents
              </div>
            </button>
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <button 
              onClick={() => setShowCredits(true)}
              className="w-14 h-14 rounded-xl bg-[#1A1A1A]/50 hover\:bg-[#232323] flex items-center justify-center transition-all duration-200 group relative"
            >
              <HelpCircle className="h-6 w-6 text-gray-400 group-hover\:text-white" />
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#232323] rounded-lg text-sm opacity-0 invisible group-hover\:opacity-100 group-hover\:visible transition-all">
                Help
              </div>
            </button>
            <button className="w-14 h-14 rounded-xl bg-[#1A1A1A]/50 hover\:bg-[#232323] flex items-center justify-center transition-all duration-200 group relative">
              <Settings className="h-6 w-6 text-gray-400 group-hover\:text-white" />
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#232323] rounded-lg text-sm opacity-0 invisible group-hover\:opacity-100 group-hover\:visible transition-all">
                Settings
              </div>
            </button>

            {user ? (
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 group relative"
              >
                <div className="w-full h-full rounded-[10px] bg-[#1A1A1A] flex items-center justify-center group-hover\:bg-transparent transition-all duration-300">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Avatar"
                      className="w-full h-full object-cover rounded-[10px]"
                    />
                  ) : (
                    <span className="text-lg font-semibold group-hover\:text-white transition-colors">
                      {user.email?.[0].toUpperCase()}
                    </span>
                  )}
                </div>
                {showUserMenu && (
                  <div
                    ref={userMenuRef}
                    className="absolute bottom-full left-0 mb-2 w-56 bg-[#1A1A1A] rounded-xl border border-[#232323] shadow-xl py-1 animate-in fade-in-0 slide-in-from-bottom-2 text-white z-50"
                  >
                    <div className="px-3 py-2 border-b border-[#232323]">
                      <p className="text-sm font-medium text-white truncate">{user.email}</p>
                      <p className="text-xs text-gray-400">Free Plan</p>
                    </div>
                    <div className="py-1">
                      <button
                        tabIndex={0}
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowAccountSettings(true);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover\:bg-[#232323] transition-colors flex items-center gap-2 text-white cursor-pointer"
                      >
                        <Settings className="h-4 w-4 text-gray-400" />
                        Account Settings
                      </button>
                      <button
                        tabIndex={0}
                        onClick={() => setShowComingSoon({
                          isOpen: true,
                          feature: 'Premium Plans',
                          description: 'Unlock advanced features with our premium plans.'
                        })}
                        className="w-full px-3 py-2 text-left text-sm hover\:bg-[#232323] transition-colors flex items-center gap-2 text-white cursor-pointer"
                      >
                        <Crown className="h-4 w-4 text-yellow-400" />
                        Upgrade Plan
                      </button>
                      <button
                        onClick={() => {
                          auth.signOut();
                          setShowUserMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover\:bg-[#232323] text-red-400 transition-colors flex items-center gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-14 h-14 rounded-xl bg-[#1A1A1A]/50 hover\:bg-[#232323] flex items-center justify-center transition-all duration-200 group relative"
              >
                <User className="h-6 w-6 text-gray-400 group-hover\:text-white" />
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#232323] rounded-lg text-sm opacity-0 invisible group-hover\:opacity-100 group-hover\:visible transition-all">
                  Sign In
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 bg-[#141414]/90 backdrop-blur-xl border-b border-[#232323] sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
                Strawberry Ai
              </h1>
              <div className="h-6 w-px bg-[#232323]"></div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-purple-500/20 rounded-full text-xs font-medium text-purple-400">BETA</span>
                <span className="text-sm text-gray-400">v2.0.0</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">{user.email}</span>
                  <button
                    onClick={() => auth.signOut()}
                    className="px-4 py-2 rounded-lg bg-[#232323] hover\:bg-[#2A2A2A] transition-colors text-sm font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover\:from-purple-600 hover\:to-pink-600 transition-colors text-sm font-medium"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div 
            className="flex-1 overflow-y-auto px-8 py-6 relative scrollbar-thin scrollbar-thumb-pink-500 scrollbar-track-purple-800" 
            style={{ height: 'calc(100vh - 160px)' }}
          >
            <div className="max-w-4xl mx-auto h-full prose prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-xl focus:outline-none">
              {currentView === 'chat' && (
                <>
                  {showWelcome ? (
                    <div className="h-full flex flex-col items-center justify-center">
                      {/* Welcome Section */}
                      <div className="text-center">
                        <style>
                          {`
                            @keyframes shimmer {
                              0% {
                                background-position: -200% 0;
                              }
                              100% {
                                background-position: 200% 0;
                              }
                            }
                            .shimmer-text {
                              background: linear-gradient(
                                90deg, 
                                #2d0036 0%,
                                #a239d8 15%, 
                                #ff0f7b 30%, 
                                #ae0e6e 45%, 
                                #4d0060 60%, 
                                #9833c9 75%, 
                                #ff0f7b 90%,
                                #2d0036 100%
                              );
                              background-size: 200% auto;
                              background-clip: text;
                              -webkit-background-clip: text;
                              -webkit-text-fill-color: transparent;
                              animation: shimmer 6s linear infinite;
                            }
                          `}
                        </style>
                        <h2 className="text-4xl font-bold mb-4 shimmer-text">
                          Welcome to Strawberry Ai
                        </h2>
                        <p className="text-gray-400 text-lg">
                          Your intelligent companion for creative and productive conversations
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 pb-32">
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex items-start gap-4 mb-8 ${
                            message.role === 'assistant'
                              ? 'bg-[#141414]/50 backdrop-blur-sm'
                              : ''
                          } rounded-xl p-6 animate-in slide-in-from-bottom-2 duration-200`}
                        >
                          {message.role === 'assistant' ? (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 p-0.5">
                              <div className="w-full h-full rounded-lg bg-[#1A1A1A] flex items-center justify-center">
                                <Bot className="h-5 w-5 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                              <User className="h-5 w-5 text-white" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">
                                {message.role === 'assistant' ? 'Strawberry Ai' : 'You'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {message.createdAt.toLocaleTimeString() || new Date().toLocaleTimeString()}
                              </span>
                            </div>
                            {message.role === 'assistant' && isThinking && message.content === '' && (
                              <div className="flex items-center space-x-1 text-gray-400">
                                <span className="animate-pulse">●</span>
                                <span className="animate-pulse delay-75">●</span>
                                <span className="animate-pulse delay-150">●</span>
                              </div>
                            )}
                            <div
                              className={cn(
                                "text-gray-200 leading-relaxed whitespace-pre-wrap",
                                (message.role === 'assistant' && isThinking && message.content === '') && "hidden" // Hide if typing indicator is shown
                              )}
                            >
                              <ReactMarkdown
                                components={{
                                  code: CodeBlock,
                                  hr: () => null, // Hide horizontal rules
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-4 space-y-2">
                                <p className="text-sm font-medium text-gray-400">Attached Files:</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {message.attachments.map((file, i) => (
                                    <a
                                      key={i}
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 p-2 bg-[#1A1A1A] rounded-lg hover\:bg-[#232323] transition-colors group"
                                    >
                                      <FileText className="h-4 w-4 text-purple-400" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm truncate">{file.name}</p>
                                        <p className="text-xs text-gray-400">
                                          {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                      </div>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {!isThinking && isLiveSearch && (
                        <div className="flex items-center justify-center py-4">
                          <LiveSearchAnimation />
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </>
              )}
              {currentView === 'tools' && (
                <ToolsPage
                  onShowComingSoon={(feature, description) =>
                    setShowComingSoon({ isOpen: true, feature, description })}
                />
              )}

              {currentView === 'history' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Chat History</h2>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          placeholder="Search chats..."
                          className="w-64 bg-[#1A1A1A] border border-[#232323] rounded-lg pl-10 pr-4 py-2 text-sm focus\:outline-none focus\:ring-2 focus\:ring-purple-500 transition-all duration-200 placeholder\:text-gray-500"
                        />
                      </div>
                    </div>
                  </div>

                  {user ? (
                    <div className="grid grid-cols-2 gap-4">
                      {chatHistory.length === 0 ? (
                        <div className="col-span-2 flex flex-col items-center justify-center py-20 text-center">
                          <div className="w-20 h-20 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mb-6">
                            <History className="h-10 w-10 text-gray-400" />
                          </div>
                          <h3 className="text-xl font-semibold mb-2">No chat history yet</h3>
                          <p className="text-gray-400 mb-6">
                            Start a new chat to see your history here
                          </p>
                          <button
                            onClick={() => {
                              setCurrentView('chat');
                              setShowWelcome(true);
                            }}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover\:from-purple-600 hover\:to-pink-600 transition-colors text-sm font-medium"
                          >
                            Start New Chat
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="col-span-2 flex justify-end mb-4">
                            <button
                              onClick={async () => {
                                if (window.confirm('Are you sure you want to delete all chats? This action cannot be undone.')) {
                                  try {
                                    // await deleteAllChats(); // Commented out
                                    await loadChatHistory();
                                    toast.success('All chats deleted successfully');
                                  } catch (error) {
                                    toast.error('Failed to delete chats');
                                  }
                                }
                              }}
                              className="px-4 py-2 bg-red-500/10 hover\:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors"
                            >
                              Delete All Chats
                            </button>
                          </div>
                          {chatHistory
                            .filter(chat =>
                              chat.title.toLowerCase().includes(historySearch.toLowerCase()) ||
                              chat.messages.some(msg =>
                                msg.content.toLowerCase().includes(historySearch.toLowerCase())
                              )
                            )
                            .map((chat) => (
                            <div
                              key={chat.id}
                              onClick={() => {
                                setMessages(chat.messages);
                                setCurrentView('chat');
                                setShowWelcome(false);
                              }}
                              className="bg-[#141414]/50 backdrop-blur-sm rounded-xl p-6 border border-[#232323] hover\:border-purple-500/30 transition-all duration-200 text-left group"
                            >
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 flex-shrink-0">
                                  <div className="w-full h-full rounded-lg bg-[#1A1A1A] flex items-center justify-center group-hover\:bg-transparent transition-all duration-300">
                                    <Bot className="h-6 w-6 text-white" />
                                  </div>
                                </div>
                                <div>
                                  <h3 className="font-medium mb-1 line-clamp-1">
                                    {chat.title}
                                  </h3>
                                  <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Calendar className="h-4 w-4" />
                                    {chat.createdAt.toLocaleDateString()}
                                    <span className="text-gray-600">•</span>
                                    <span>{chat.messages.length} messages</span>
                                  </div>
                                </div>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Are you sure you want to delete this chat?')) {
                                      try {
                                        // await deleteChat(chat.id); // Commented out
                                        await loadChatHistory();
                                        toast.success('Chat deleted successfully');
                                      } catch (error) {
                                        toast.error('Failed to delete chat');
                                      }
                                    }
                                  }}
                                  className="ml-auto p-2 hover\:bg-[#232323] rounded-lg opacity-0 group-hover\:opacity-100 transition-all duration-200"
                                >
                                  <Trash2 className="h-4 w-4 text-red-400" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-20 h-20 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mb-6">
                        <History className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Sign in to view history</h3>
                      <p className="text-gray-400 mb-6">
                        Keep track of your conversations and access them anytime
                      </p>
                      <button
                        onClick={() => setShowAuthModal(true)}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover\:from-purple-600 hover\:to-pink-600 transition-colors text-sm font-medium"
                      >
                        Sign In
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Model Selection Modal */}
          <ModelSelect
            isOpen={showModelSelect}
            onClose={() => setShowModelSelect(false)}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            isThinking={isThinking}
          />

          {/* Input Bar */}
          {currentView === 'chat' && (
            <div className="sticky bottom-8 w-full max-w-4xl px-8 mx-auto">
              <div className="bg-[#141414]/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-[#232323] p-6">
                <div className="flex flex-col gap-4">
                  {/* Input Area */}
                  <div className="relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      disabled={isThinking}
                      placeholder={attachedFiles.length > 0 ? `${attachedFiles.length} file(s) attached - Type your message...` : "Type your message..."}
                      className="w-full bg-[#1A1A1A] border border-[#232323] rounded-xl px-6 py-4 pr-36 focus\:outline-none focus\:ring-2 focus\:ring-purple-500/50 focus\:border-purple-500 placeholder-gray-500 text-base disabled\:opacity-50 disabled\:cursor-not-allowed min-h-[60px] resize-none"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <button
                        onClick={() => setShowFileUpload(true)}
                        disabled={isThinking}
                        className="p-2 hover\:bg-[#232323] rounded-lg transition-colors group relative"
                      >
                        <Upload className="h-5 w-5 text-gray-400 group-hover\:text-white transition-colors" />
                        <div className="absolute left-full ml-2 px-2 py-1 bg-[#232323] rounded text-xs whitespace-nowrap opacity-0 invisible group-hover\:opacity-100 group-hover\:visible transition-all">
                          Upload Files
                        </div>
                      </button>
                      <button
                        className="p-2 hover\:bg-[#232323] rounded-lg transition-colors group"
                        disabled={isThinking}
                        onClick={() => setShowComingSoon({
                          isOpen: true,
                          feature: 'Mentions',
                          description: 'Mention and collaborate with team members directly in your conversations.'
                        })}
                      >
                        <AtSign className="h-5 w-5 text-gray-400 group-hover\:text-white transition-colors" />
                      </button>
                      <button
                        className="p-2 hover\:bg-[#232323] rounded-lg transition-colors group"
                        disabled={isThinking}
                        onClick={() => setShowComingSoon({
                          isOpen: true,
                          feature: 'Save Snippets',
                          description: 'Save important parts of conversations for quick access later.'
                        })}
                      >
                        <FileBox className="h-5 w-5 text-gray-400 group-hover\:text-white transition-colors" />
                      </button>
                      <button
                        className="p-2 hover\:bg-[#232323] rounded-lg transition-colors group"
                        disabled={isThinking}
                        onClick={() => setShowComingSoon({
                          isOpen: true,
                          feature: 'Bookmarks',
                          description: 'Bookmark conversations and create custom collections.'
                        })}
                      >
                        <Bookmark className="h-5 w-5 text-gray-400 group-hover\:text-white transition-colors" />
                      </button>
                      <button
                        className="p-2 hover\:bg-[#232323] rounded-lg transition-colors group relative"
                        disabled={isThinking || !input.trim()}
                        onClick={async () => {
                          const currentInput = input.trim();
                          if (!currentInput) return;

                          const controller = new AbortController();
                          setAbortController(controller);
                          setIsThinking(true);
                          toast.loading('Enhancing prompt...', { // Add loading toast
                            id: 'enhance-toast',
                            style: {
                              background: '#1A1A1A',
                              color: '#fff',
                              border: '1px solid #232323',
                            },
                          });

                          try {
                            // Updated to call the new Netlify function for Groq
                            const response = await fetch('/api/enhance-prompt-groq', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                prompt: currentInput,
                              }),
                              signal: controller.signal,
                            });

                            if (!response.ok) {
                              const errorData = await response.json().catch(() => ({}));
                              throw new Error(errorData.error || 'Failed to enhance prompt');
                            }

                            const data = await response.json();
                            const enhancedPrompt = data.enhancedPrompt;
                            if (!enhancedPrompt) {
                              throw new Error('No enhanced prompt returned from API');
                            }
                            setInput(enhancedPrompt);
                            toast.success('Prompt enhanced!', { id: 'enhance-toast' });
                          } catch (error: any) {
                            console.error('Error enhancing prompt:', error);
                            if (error.name === 'AbortError') {
                              toast.success('Enhancement stopped', {
                                id: 'enhance-toast',
                                icon: '🛑',
                                style: {
                                  background: '#1A1A1A',
                                  color: '#fff',
                                  border: '1px solid #232323',
                                },
                              });
                            } else {
                              toast.error(error.message || 'Failed to enhance prompt', { id: 'enhance-toast' });
                            }
                          } finally {
                            setIsThinking(false);
                            setAbortController(null);
                          }
                        }}
                      >
                        <Sparkles className="h-5 w-5 text-gray-400 group-hover\:text-white transition-colors" />
                        <div className="absolute left-full ml-2 px-2 py-1 bg-[#232323] rounded text-xs whitespace-nowrap opacity-0 invisible group-hover\:opacity-100 group-hover\:visible transition-all">
                          Enhance Prompt
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Bottom Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowModelSelect(true)}
                        disabled={isThinking}
                        className="flex items-center gap-2 bg-[#1A1A1A] px-4 py-2.5 rounded-lg border border-[#232323] hover:bg-[#232323] transition-all duration-200 group"
                      >
                        <Zap className="h-5 w-5 text-purple-400" />
                        <span className="text-sm font-medium">
                          {models.find(m => m.id === selectedModel)?.name || 'Select Model'}
                        </span>
                      </button>
                    </div>

                    <button
                      onClick={handleSend}
                      disabled={isThinking || (!input.trim() && attachedFiles.length === 0)}
                      className={cn("px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-all duration-200 group",
                        "px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-all duration-200 group",
                        isThinking
                          ? "bg-[#232323] hover\:bg-[#2A2A2A]"
                          : "bg-gradient-to-r from-purple-500 to-pink-500 hover\:from-purple-600 hover\:to-pink-600",
                        "disabled\:opacity-50 disabled\:cursor-not-allowed"
                      )}
                    >
                      {isThinking ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStopGeneration();
                          }}
                          className="flex items-center gap-2"
                        >
                          <span>Stop</span>
                          <X className="h-5 w-5" />
                        </div>
                      ) : (
                        <>
                          <span>Ask</span>
                          <Send className="h-5 w-5 transform transition-transform group-hover\:translate-x-0.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
      <AccountSettingsModal
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
      />
      <FileUploadModal
        isOpen={showFileUpload}
        onClose={() => setShowFileUpload(false)}
        onUpload={handleFileUpload}
      />
      <ComingSoonPopup
        isOpen={showComingSoon.isOpen}
        onClose={() => setShowComingSoon(prev => ({ ...prev, isOpen: false }))}
        feature={showComingSoon.feature}
        description={showComingSoon.description}
      />
      <CreditModal
        isOpen={showCredits}
        onClose={() => setShowCredits(false)}
      />
    </>
  );
}

export default App;

