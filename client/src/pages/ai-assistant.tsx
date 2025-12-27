import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import {
  MessageCircle,
  Send,
  Sparkles,
  TrendingUp,
  FileText,
  DollarSign,
  Users,
  Loader2,
  ChevronRight,
  BarChart3,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Mail,
  AlertCircle,
  ExternalLink,
  Download,
  MoreVertical,
  Clock,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import type { AiConversation, AiMessage } from '@shared/schema';

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
  data?: any;
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

// Types from schema
interface ConversationWithMessages extends AiConversation {
  messages?: AiMessage[];
}

export default function AIAssistantPage() {
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [editingTitle, setEditingTitle] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch all conversations
  const { data: conversations = [], isLoading: loadingConversations } = useQuery<AiConversation[]>({
    queryKey: ['/api/ai-conversations'],
  });

  // Fetch active conversation with messages
  const { data: activeConversation, isLoading: loadingMessages } = useQuery<ConversationWithMessages>({
    queryKey: ['/api/ai-conversations', activeConversationId],
    enabled: !!activeConversationId,
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (title?: string) => {
      return await apiRequest('/api/ai-conversations', 'POST', { title: title || 'New Conversation' });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-conversations'] });
      setActiveConversationId(data.id);
    },
  });

  // Update conversation mutation
  const updateConversationMutation = useMutation({
    mutationFn: async ({ id, title, isArchived }: { id: number; title?: string; isArchived?: boolean }) => {
      return await apiRequest(`/api/ai-conversations/${id}`, 'PATCH', { title, isArchived });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-conversations'] });
      setEditingTitle(null);
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/ai-conversations/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-conversations'] });
      if (activeConversationId === conversationToDelete) {
        setActiveConversationId(null);
      }
      setConversationToDelete(null);
      setDeleteDialogOpen(false);
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: number; content: string }) => {
      return await apiRequest(`/api/ai-conversations/${conversationId}/messages`, 'POST', { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-conversations', activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-conversations'] });
    },
  });

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
  });

  // Send reminders mutation
  const sendRemindersMutation = useMutation({
    mutationFn: async (invoiceIds: number[]) => {
      return await apiRequest('/api/invoice-reminders/send', 'POST', { invoiceIds });
    },
    onSuccess: () => {
      setPendingAction(null);
      queryClient.invalidateQueries({ queryKey: ['/api/ai-conversations', activeConversationId] });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  // Focus input when conversation changes
  useEffect(() => {
    if (activeConversationId) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeConversationId]);

  const handleNewConversation = () => {
    createConversationMutation.mutate('New Conversation');
  };

  const handleSelectConversation = (id: number) => {
    setActiveConversationId(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || sendMessageMutation.isPending) return;

    let conversationId: number = activeConversationId ?? 0;

    // Create a new conversation if none is active
    if (!activeConversationId) {
      const newConversation = await createConversationMutation.mutateAsync('New Conversation');
      conversationId = newConversation.id;
    }

    sendMessageMutation.mutate({ conversationId, content: inputValue });
    setInputValue('');
  };

  const handleSuggestedQuery = async (query: string) => {
    setInputValue(query);

    let conversationId: number = activeConversationId ?? 0;
    if (!activeConversationId) {
      const newConversation = await createConversationMutation.mutateAsync('New Conversation');
      conversationId = newConversation.id;
    }

    sendMessageMutation.mutate({ conversationId, content: query });
  };

  const handleAction = (action: ChatAction) => {
    if (action.action === 'navigate' && action.params?.path) {
      setLocation(action.params.path);
    } else if (action.action === 'sendReminders' && action.params?.invoiceIds) {
      previewRemindersMutation.mutate(action.params.invoiceIds);
    }
  };

  const handleConfirmReminders = () => {
    if (pendingAction?.invoiceIds) {
      const canSendIds = pendingAction.previews
        ?.filter(p => p.canSend)
        .map(p => p.invoiceId) || pendingAction.invoiceIds;
      sendRemindersMutation.mutate(canSendIds);
    }
  };

  const handleCancelAction = () => {
    setPendingAction(null);
  };

  const handleStartEditTitle = (id: number, currentTitle: string) => {
    setEditingTitle(id);
    setNewTitle(currentTitle);
  };

  const handleSaveTitle = (id: number) => {
    if (newTitle.trim()) {
      updateConversationMutation.mutate({ id, title: newTitle.trim() });
    }
  };

  const handleDeleteConversation = (id: number) => {
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleExportConversation = () => {
    if (!activeConversation?.messages) return;

    const exportData = {
      title: activeConversation.title,
      createdAt: activeConversation.createdAt,
      messages: activeConversation.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.createdAt,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${activeConversation.id}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const messages = activeConversation?.messages || [];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50">
      {/* Sidebar - Conversation History */}
      <div className="w-72 border-r bg-white flex flex-col">
        <div className="p-4 border-b">
          <Button
            onClick={handleNewConversation}
            className="w-full bg-sky-500 hover:bg-sky-600"
            disabled={createConversationMutation.isPending}
          >
            {createConversationMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            New Conversation
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              No conversations yet
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors",
                    activeConversationId === conversation.id
                      ? "bg-sky-50 border border-sky-200"
                      : "hover:bg-slate-50"
                  )}
                  onClick={() => handleSelectConversation(conversation.id)}
                >
                  <MessageCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />

                  {editingTitle === conversation.id ? (
                    <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTitle(conversation.id);
                          if (e.key === 'Escape') setEditingTitle(null);
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleSaveTitle(conversation.id)}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setEditingTitle(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-700 truncate">
                          {conversation.title}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(conversation.updatedAt), 'MMM d, h:mm a')}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStartEditTitle(conversation.id, conversation.title)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteConversation(conversation.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900">Vedo AI Assistant</h1>
              <p className="text-sm text-slate-500">
                {activeConversation ? activeConversation.title : 'Start a new conversation'}
              </p>
            </div>
          </div>

          {activeConversation && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportConversation}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {!activeConversationId || messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-100 to-sky-50 flex items-center justify-center mb-6">
                <BarChart3 className="w-10 h-10 text-sky-500" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Hi! I'm your financial assistant</h2>
              <p className="text-slate-500 mb-8 max-w-md">
                Ask me about your expenses, invoices, revenue, or anything about your books.
                Your conversations are saved so you can continue where you left off.
              </p>

              {/* Suggested Queries */}
              <div className="w-full max-w-md space-y-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Try asking:</p>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTED_QUERIES.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedQuery(suggestion.query)}
                      className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-left transition-colors group"
                    >
                      <suggestion.icon className="w-5 h-5 text-slate-400 group-hover:text-sky-500 transition-colors" />
                      <span className="text-sm text-slate-600">{suggestion.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <ChatMessageBubble
                  key={message.id}
                  message={{
                    id: message.id.toString(),
                    role: message.role as 'user' | 'assistant',
                    content: message.content,
                    timestamp: new Date(message.createdAt),
                    data: message.data as any,
                    actions: message.actions as ChatAction[] | undefined,
                  }}
                  onAction={handleAction}
                />
              ))}

              {/* Loading indicator */}
              {sendMessageMutation.isPending && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl rounded-tl-md px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Pending action confirmation */}
              {pendingAction && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 bg-amber-50 border border-amber-200 rounded-2xl rounded-tl-md p-5">
                    <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Confirm: Send Invoice Reminders
                    </h4>

                    {previewRemindersMutation.isPending ? (
                      <div className="flex items-center gap-2 text-amber-700">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Preparing reminders...
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-amber-700 mb-4">
                          Ready to send reminders to {pendingAction.previews?.filter(p => p.canSend).length || 0} customers:
                        </p>

                        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                          {pendingAction.previews?.map((preview) => (
                            <div
                              key={preview.invoiceId}
                              className={cn(
                                "flex items-center justify-between text-sm p-3 rounded-lg",
                                preview.canSend ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {preview.canSend ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-slate-400" />
                                )}
                                <span className="font-medium">{preview.customerName}</span>
                              </div>
                              <div className="text-right">
                                <div>{preview.invoiceNumber}</div>
                                {!preview.canSend && (
                                  <div className="text-xs text-slate-400">{preview.reason}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-3">
                          <Button
                            onClick={handleConfirmReminders}
                            disabled={sendRemindersMutation.isPending || !pendingAction.previews?.some(p => p.canSend)}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            {sendRemindersMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Mail className="w-4 h-4 mr-2" />
                                Send Reminders
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleCancelAction}
                            disabled={sendRemindersMutation.isPending}
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
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t bg-white p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about your finances..."
                className="flex-1 h-12 px-5 rounded-xl border-slate-200 focus:ring-sky-500/20 focus:border-sky-400"
                disabled={sendMessageMutation.isPending}
              />
              <Button
                type="submit"
                className="h-12 w-12 p-0 rounded-xl bg-sky-500 hover:bg-sky-600"
                disabled={!inputValue.trim() || sendMessageMutation.isPending}
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => conversationToDelete && deleteConversationMutation.mutate(conversationToDelete)}
            >
              {deleteConversationMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Chat message bubble component
function ChatMessageBubble({ message, onAction }: { message: ChatMessage; onAction?: (action: ChatAction) => void }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn("flex items-start gap-4", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
        isUser
          ? "bg-slate-200 text-slate-600"
          : "bg-gradient-to-br from-sky-500 to-sky-600 text-white"
      )}>
        {isUser ? (
          <MessageCircle className="w-5 h-5" />
        ) : (
          <Sparkles className="w-5 h-5" />
        )}
      </div>

      {/* Message */}
      <div className={cn(
        "max-w-[80%] rounded-2xl px-5 py-4",
        isUser
          ? "bg-sky-500 text-white rounded-tr-md"
          : "bg-white border border-slate-200 text-slate-700 rounded-tl-md shadow-sm"
      )}>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>

        {/* Data display (tables, etc.) */}
        {message.data && (
          <div className={cn(
            "mt-4 p-4 rounded-xl text-sm",
            isUser ? "bg-white/20" : "bg-slate-50"
          )}>
            <DataDisplay data={message.data} />
          </div>
        )}

        {/* Quick actions */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {message.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => onAction?.(action)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                  isUser
                    ? "bg-white/20 hover:bg-white/30 text-white"
                    : "bg-sky-50 hover:bg-sky-100 text-sky-700"
                )}
              >
                {action.label}
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className={cn(
          "mt-2 text-xs",
          isUser ? "text-white/60" : "text-slate-400"
        )}>
          {format(message.timestamp, 'h:mm a')}
        </div>
      </div>
    </div>
  );
}

// Data display component for structured responses
function DataDisplay({ data }: { data: any }) {
  if (!data) return null;

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
                <th key={i} className="text-left py-2 px-3 font-medium text-slate-600">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row: any[], i: number) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className="py-2 px-3 text-slate-700">{cell}</td>
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
      <ul className="space-y-1.5">
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
