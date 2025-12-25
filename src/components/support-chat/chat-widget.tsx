"use client";

/**
 * Support Chat Widget
 *
 * Floating chat widget for public website and in-app support.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
// Note: Using native scrolling instead of ScrollArea for proper ref handling
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Minimize2,
  Maximize2,
  ExternalLink,
} from "lucide-react";
import { QUICK_ACTIONS, DEEP_LINKS } from "@/lib/support-chat/constants";

type Message = {
  id: string;
  sender: "user" | "bot" | "agent";
  content: string;
  timestamp: Date;
  citations?: Array<{ article_id: string; title: string }>;
};

type QuickAction = {
  label: string;
  action: string;
  link?: string;
};

type ChatWidgetProps = {
  mode: "public" | "homeowner" | "provider" | "handyman";
  initialMessage?: string;
  position?: "bottom-right" | "bottom-left";
};

export function ChatWidget({
  mode = "public",
  initialMessage,
  position = "bottom-right",
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [publicToken, setPublicToken] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get quick actions based on mode
  const quickActions: QuickAction[] = [
    ...(mode === "public"
      ? QUICK_ACTIONS.PUBLIC
      : mode === "homeowner"
      ? QUICK_ACTIONS.HOMEOWNER
      : mode === "provider"
      ? QUICK_ACTIONS.PROVIDER
      : QUICK_ACTIONS.HANDYMAN),
  ];

  // Initialize conversation
  useEffect(() => {
    if (isOpen && !conversationId && mode === "public") {
      initializePublicConversation();
    }
  }, [isOpen, conversationId, mode]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Add initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting =
        mode === "public"
          ? "Hi! I'm the RegularUpkeep assistant. How can I help you today?"
          : `Hello! I'm here to help. What can I assist you with?`;

      setMessages([
        {
          id: "greeting",
          sender: "bot",
          content: greeting,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, mode, messages.length]);

  const initializePublicConversation = async () => {
    try {
      const response = await fetch("/api/support-chat/token", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setConversationId(data.conversationId);
        setPublicToken(data.token);
      }
    } catch (error) {
      console.error("Failed to initialize conversation:", error);
    }
  };

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || loading) return;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        sender: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setLoading(true);

      try {
        const response = await fetch("/api/support-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            conversationId,
            publicToken,
            channel: mode === "public" ? "website" : "in_app",
          }),
        });

        if (response.ok) {
          const data = await response.json();

          // Update conversation ID if new
          if (data.conversationId && !conversationId) {
            setConversationId(data.conversationId);
          }

          const botMessage: Message = {
            id: `bot-${Date.now()}`,
            sender: "bot",
            content: data.message.content,
            timestamp: new Date(),
            citations: data.message.citations,
          };

          setMessages((prev) => [...prev, botMessage]);
        } else {
          throw new Error("Failed to send message");
        }
      } catch (error) {
        console.error("Failed to send message:", error);

        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            sender: "bot",
            content:
              "I apologize, but I'm having trouble connecting. Please try again in a moment.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [conversationId, publicToken, loading, mode]
  );

  const handleQuickAction = (action: QuickAction) => {
    if (action.link) {
      window.location.href = action.link;
      return;
    }

    // Map action to message
    const messageMap: Record<string, string> = {
      pricing: "What are your pricing plans?",
      how_it_works: "How does RegularUpkeep work?",
      callback: "I'd like to request a callback",
      support: "I need help with my account",
      request_service: "I want to request a service",
      bookings: "I have a question about my bookings",
      billing: "I have a billing question",
      jobs: "I have a question about my jobs",
      payments: "I have a question about payments",
      account: "I need help with my account",
      current_job: "I have a question about my current job",
      earnings: "I have a question about my earnings",
      app_help: "I need help with the app",
    };

    const message = messageMap[action.action] || action.label;
    sendMessage(message);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const positionClasses =
    position === "bottom-right" ? "right-4 sm:right-6" : "left-4 sm:left-6";

  if (!isOpen) {
    return (
      <div className={`fixed bottom-4 sm:bottom-6 ${positionClasses} z-50`}>
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="sr-only">Open support chat</span>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-4 sm:bottom-6 ${positionClasses} z-50 w-[calc(100vw-2rem)] sm:w-96`}
    >
      <div className="bg-background border rounded-lg shadow-xl overflow-hidden flex flex-col h-[500px]">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <span className="font-semibold">RegularUpkeep Support</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 p-4 overflow-y-auto"
            >
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.sender === "user"
                          ? "bg-primary text-primary-foreground"
                          : message.sender === "agent"
                          ? "bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800"
                          : "bg-muted"
                      }`}
                    >
                      {message.sender === "agent" && (
                        <Badge variant="outline" className="mb-2 text-xs">
                          Support Agent
                        </Badge>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.citations && message.citations.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-current/10">
                          <p className="text-xs opacity-70">Sources:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {message.citations.map((citation) => (
                              <Badge
                                key={citation.article_id}
                                variant="secondary"
                                className="text-xs"
                              >
                                {citation.title}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            {messages.length === 1 && (
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <Button
                      key={action.action}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleQuickAction(action)}
                    >
                      {action.label}
                      {action.link && <ExternalLink className="h-3 w-3 ml-1" />}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={loading}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
