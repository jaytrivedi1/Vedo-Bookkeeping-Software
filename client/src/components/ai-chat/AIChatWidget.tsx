import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  TrendingUp,
  FileText,
  DollarSign,
  Users,
  Loader2,
  ChevronRight,
  BarChart3,
  Maximize2,
  Minimize2,
  ExternalLink,
  Mail,
  Check,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

interface ReminderPreview {
  invoiceId: number;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string | null;
  amount: number;
  canSend: boolean;
  reason?: string;
}

interface PendingAction {
  type: 'sendReminders';
  invoiceIds: number[];
  previews?: ReminderPreview[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any; // For structured data responses (tables, charts, etc.)
  actions?: ChatAction[];
}

interface ChatAction {
  label: string;
  action: string;
  params?: any;
}

interface SuggestedQuery {
  icon: React.ElementType;
  label: string;
  query: string;
}

const SUGGESTED_QUERIES: SuggestedQuery[] = [
  { icon: TrendingUp, label: 'Monthly summary', query: 'How are we doing this month?' },
  { icon: FileText, label: 'Unpaid invoices', query: 'Show me unpaid invoices' },
  { icon: DollarSign, label: 'Recent expenses', query: 'What were my expenses this week?' },
  { icon: Users, label: 'Top customers', query: 'Who are my top 5 customers?' },
];

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  // Preview reminders mutation
  const previewRemindersMutation = useMutation({
    mutationFn: async (invoiceIds: number[]) => {
      return await apiRequest('/api/invoice-reminders/preview', 'POST', { invoiceIds });
    },
    onSuccess: (data, invoiceIds) => {
      setPendingAction({
        type: 'sendReminders',
        invoiceIds,
        previews: data.previews,
      });
    },
    onError: (error: any) => {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Sorry, I couldn't prepare the reminders: ${error.message || 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    },
  });

  // Send reminders mutation
  const sendRemindersMutation = useMutation({
    mutationFn: async (invoiceIds: number[]) => {
      return await apiRequest('/api/invoice-reminders/send', 'POST', { invoiceIds });
    },
    onSuccess: (data) => {
      setPendingAction(null);
      const resultMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ **Reminders sent!**\n\n` +
          `• Sent: ${data.sent}\n` +
          `• Failed: ${data.failed}\n` +
          `• Skipped (no email): ${data.skipped}\n\n` +
          (data.sent > 0 ? `Your customers have been notified about their overdue invoices.` : ''),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, resultMessage]);
    },
    onError: (error: any) => {
      setPendingAction(null);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Failed to send reminders: ${error.message || 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    },
  });

  // Handle action button clicks
  const handleAction = (action: ChatAction) => {
    if (action.action === 'navigate' && action.params?.path) {
      setIsOpen(false); // Close chat panel
      setLocation(action.params.path);
    } else if (action.action === 'sendReminders' && action.params?.invoiceIds) {
      // Show confirmation before sending reminders
      previewRemindersMutation.mutate(action.params.invoiceIds);
    }
  };

  // Confirm sending reminders
  const handleConfirmReminders = () => {
    if (pendingAction?.invoiceIds) {
      const canSendIds = pendingAction.previews
        ?.filter(p => p.canSend)
        .map(p => p.invoiceId) || pendingAction.invoiceIds;
      sendRemindersMutation.mutate(canSendIds);
    }
  };

  // Cancel pending action
  const handleCancelAction = () => {
    setPendingAction(null);
    const cancelMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Okay, I cancelled the reminder action. Let me know if you need anything else!',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, cancelMessage]);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (query: string) => {
      return await apiRequest('/api/ai-chat', 'POST', { query });
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        data: data.data,
        actions: data.actions,
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error: any) => {
      // Parse error message to extract user-friendly text
      let errorContent = 'Sorry, I encountered an error processing your request.';

      try {
        const errorStr = error.message || '';
        // Check for "No active company selected" error
        if (errorStr.includes('No active company selected') || errorStr.includes('"error":"No active company')) {
          errorContent = "Please select a company first to use the AI assistant. Go to Settings → Company to set up or select your company.";
        } else if (errorStr.includes('{')) {
          // Try to parse JSON error
          const jsonMatch = errorStr.match(/\{.*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            errorContent = parsed.error || parsed.message || errorContent;
          }
        } else if (errorStr) {
          // Use error message directly if it's not JSON
          errorContent = errorStr.replace(/^\d+:\s*/, ''); // Remove status code prefix
        }
      } catch {
        // Keep default error message
      }

      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    chatMutation.mutate(inputValue);
    setInputValue('');
  };

  const handleSuggestedQuery = (query: string) => {
    setInputValue(query);
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    chatMutation.mutate(query);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full",
          "bg-gradient-to-br from-sky-500 to-sky-600 text-white",
          "shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40",
          "flex items-center justify-center",
          "transition-all duration-300 hover:scale-105",
          isOpen && "scale-0 opacity-0"
        )}
        data-testid="button-ai-chat-open"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {/* Backdrop for expanded mode */}
      {isExpanded && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Panel */}
      <div
        className={cn(
          "fixed z-50",
          "bg-white shadow-2xl border border-slate-200/60",
          "flex flex-col overflow-hidden",
          "transition-all duration-300 ease-out",
          // Expanded mode: full-height side panel
          isExpanded
            ? "top-0 right-0 bottom-0 w-[480px] max-w-[90vw] rounded-none border-r-0 border-t-0 border-b-0"
            : "bottom-6 right-6 w-[400px] max-w-[calc(100vw-3rem)] rounded-2xl h-[600px] max-h-[calc(100vh-3rem)]",
          isOpen
            ? "opacity-100 translate-x-0"
            : isExpanded
              ? "opacity-0 translate-x-full pointer-events-none"
              : "opacity-0 translate-y-4 pointer-events-none h-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Vedo AI</h3>
              <p className="text-[10px] text-slate-500">Financial Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
              onClick={() => {
                setIsOpen(false);
                setLocation('/ai-assistant');
              }}
              data-testid="button-ai-chat-full-page"
              title="Open full assistant"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid="button-ai-chat-expand"
              title={isExpanded ? "Minimize" : "Expand"}
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
              onClick={() => setIsOpen(false)}
              data-testid="button-ai-chat-close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-100 to-sky-50 flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-sky-500" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-1">Hi! I'm your financial assistant</h4>
              <p className="text-sm text-slate-500 mb-6">
                Ask me about your expenses, invoices, revenue, or anything about your books.
              </p>

              {/* Suggested Queries */}
              <div className="w-full space-y-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Try asking:</p>
                {SUGGESTED_QUERIES.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuery(suggestion.query)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-left transition-colors group"
                    data-testid={`suggested-query-${index}`}
                  >
                    <suggestion.icon className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
                    <span className="flex-1 text-sm text-slate-600">{suggestion.label}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessageBubble key={message.id} message={message} onAction={handleAction} />
              ))}

              {/* Typing indicator */}
              {chatMutation.isPending && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Pending action confirmation */}
              {pendingAction && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 bg-amber-50 border border-amber-200 rounded-2xl rounded-tl-md p-4">
                    <h4 className="font-semibold text-amber-800 text-sm mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Confirm: Send Invoice Reminders
                    </h4>

                    {previewRemindersMutation.isPending ? (
                      <div className="flex items-center gap-2 text-amber-700 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Preparing reminders...
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-amber-700 mb-3">
                          Ready to send reminders to {pendingAction.previews?.filter(p => p.canSend).length || 0} customers:
                        </p>

                        <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                          {pendingAction.previews?.map((preview) => (
                            <div
                              key={preview.invoiceId}
                              className={cn(
                                "flex items-center justify-between text-xs p-2 rounded",
                                preview.canSend ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {preview.canSend ? (
                                  <Check className="w-3 h-3 text-green-600" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 text-slate-400" />
                                )}
                                <span className="font-medium">{preview.customerName}</span>
                              </div>
                              <div className="text-right">
                                <div>{preview.invoiceNumber}</div>
                                {!preview.canSend && (
                                  <div className="text-[10px] text-slate-400">{preview.reason}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleConfirmReminders}
                            disabled={sendRemindersMutation.isPending || !pendingAction.previews?.some(p => p.canSend)}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                          >
                            {sendRemindersMutation.isPending ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Mail className="w-3 h-3 mr-1" />
                                Send Reminders
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelAction}
                            disabled={sendRemindersMutation.isPending}
                            className="text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about your finances..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all"
              disabled={chatMutation.isPending}
              data-testid="input-ai-chat"
            />
            <Button
              type="submit"
              size="sm"
              className="h-10 w-10 p-0 rounded-xl bg-sky-500 hover:bg-sky-600 shadow-sm"
              disabled={!inputValue.trim() || chatMutation.isPending}
              data-testid="button-ai-chat-send"
            >
              {chatMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

// Chat message bubble component
function ChatMessageBubble({ message, onAction }: { message: ChatMessage; onAction?: (action: ChatAction) => void }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
        isUser
          ? "bg-slate-200 text-slate-600"
          : "bg-gradient-to-br from-sky-500 to-sky-600 text-white"
      )}>
        {isUser ? (
          <MessageCircle className="w-4 h-4" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
      </div>

      {/* Message */}
      <div className={cn(
        "max-w-[75%] rounded-2xl px-4 py-3",
        isUser
          ? "bg-sky-500 text-white rounded-tr-md"
          : "bg-slate-100 text-slate-700 rounded-tl-md"
      )}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Data display (tables, etc.) */}
        {message.data && (
          <div className="mt-3 p-3 bg-white/80 rounded-xl text-xs">
            <DataDisplay data={message.data} />
          </div>
        )}

        {/* Quick actions */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => onAction?.(action)}
                className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
              >
                {action.label}
                <ExternalLink className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Data display component for structured responses
function DataDisplay({ data }: { data: any }) {
  if (!data) return null;

  // Handle different data types
  if (data.type === 'summary') {
    return (
      <div className="space-y-2">
        {Object.entries(data.metrics).map(([key, value]: [string, any]) => (
          <div key={key} className="flex justify-between items-center">
            <span className="text-slate-500">{key}</span>
            <span className="font-semibold text-slate-700">{value}</span>
          </div>
        ))}
      </div>
    );
  }

  if (data.type === 'table') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              {data.headers.map((header: string, i: number) => (
                <th key={i} className="text-left py-1 px-2 font-medium text-slate-600">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row: any[], i: number) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className="py-1 px-2 text-slate-700">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.type === 'list') {
    return (
      <ul className="space-y-1">
        {data.items.map((item: string, i: number) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            <span className="text-slate-700">{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return null;
}

export default AIChatWidget;
