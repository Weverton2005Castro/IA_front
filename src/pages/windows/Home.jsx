import { useMemo, useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { collection, addDoc, getDocs, setDoc, doc, deleteDoc } from "firebase/firestore"
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { sendChatMessage } from '../../services/api';

export default function Home() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [message, setMessage] = useState('');
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);

  const messagesEndRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId),
    [activeConversationId, conversations]
  );
  useEffect(() => {
    async function loadConversations() {
      if (!auth.currentUser) {
        return;
      }
      try {
        const snapshot = await getDocs(
          collection(
            db,
            'users',
            auth.currentUser.uid,
            'conversations'
          )
        );

        const loadedConversations =
          snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }));
        setConversations(loadedConversations);
        if (loadedConversations.length > 0) {
          setActiveConversationId(
            loadedConversations[0].id
          );
        }
      } catch (error) {
        console.error(error);
      }
    }
    loadConversations();
  }, []);


  async function saveConversation(conversation) {
    if (!auth.currentUser) {
      return;
    }
    try {
      await setDoc(
        doc(
          db,
          'users',
          auth.currentUser.uid,
          'conversations',
          String(conversation.id)
        ),
        conversation
      );
    } catch (error) {
      console.error(error);
    }
  }

  async function handleDeleteConversation(
    conversationId
  ) {
    try {
      await deleteDoc(
        doc(
          db,
          'users',
          auth.currentUser.uid,
          'conversations',
          String(conversationId)
        )
      );
      const updatedConversations =
        conversations.filter(
          (conversation) =>
            conversation.id !== conversationId
        );
      setConversations(
        updatedConversations
      );
      if (
        activeConversationId ===
        conversationId
      ) {
        setActiveConversationId(
          updatedConversations[0]?.id
          || null
        );
      }
    } catch (error) {
      console.error(error);
    }
  }

  function handleNewConversation() {
    const nextConversation = {
      id: Date.now(),
      title: `Nova conversa ${conversations.length + 1}`,
      lastMessage: 'Sem mensagens ainda',
      messages: [],
    };

    setConversations((currentConversations) => [nextConversation, ...currentConversations]);
    setActiveConversationId(nextConversation.id);
    setMessage('');
    saveConversation(nextConversation);
  }

  async function handleSendMessage() {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !activeConversation) {
      return;
    }
    const nextMessage = {
      id: Date.now(),
      role: 'user',
      content: trimmedMessage,
    };
    const conversationId = activeConversation.id;
    setConversations((currentConversations) =>
      currentConversations.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation;
        }
        return {
          ...conversation,
          title: conversation.messages.length === 0 ? trimmedMessage.slice(0, 32) : conversation.title,
          lastMessage: trimmedMessage,
          messages: [...conversation.messages, nextMessage],
        };
      })
    );
    setMessage('');
    setIsAssistantTyping(true);

    await saveConversation({
      ...activeConversation,
      messages: [
        ...activeConversation.messages,
        nextMessage,
      ],
      lastMessage: trimmedMessage,
    });

    try {
      const response = await sendChatMessage({
        message: trimmedMessage,
        history: activeConversation.messages,
      });

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response,
      };

      setConversations((currentConversations) =>
        currentConversations.map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }

          return {
            ...conversation,
            lastMessage: assistantMessage.content,
            messages: [...conversation.messages, assistantMessage],
          };
        })
      );
      await saveConversation({
        ...activeConversation,
        messages: [
          ...activeConversation.messages,
          nextMessage,
          assistantMessage,
        ],
        lastMessage:
          assistantMessage.content,
      });

    } catch (error) {
      console.error(error);

      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: error.message,
      };

      setConversations((currentConversations) =>
        currentConversations.map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }

          return {
            ...conversation,
            lastMessage: errorMessage.content,
            messages: [...conversation.messages, errorMessage],
          };
        })
      );
    } finally {
      setIsAssistantTyping(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    navigate('/');
  }

  useEffect(() => {
    messagesEndRef.current?.
      scrollIntoView({
        behavior: 'smooth'
      });
  }, [activeConversation]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0f172a] text-white">
      <aside className="flex w-[300px] flex-col border-r border-white/10 bg-[#111827]">
        <div className="border-b border-white/10 p-5">
          <h1 className="text-2xl font-bold">Chat AI</h1>
          <p className="mt-1 text-sm text-gray-400">Seu assistente inteligente</p>
        </div>

        <div className="p-4">
          <button
            className="w-full rounded-xl bg-blue-600 p-3 font-semibold shadow-lg transition-all duration-200 hover:bg-blue-700"
            type="button"
            onClick={handleNewConversation}
          >
            + Nova Conversa
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
          {conversations.map((conversation) => (

            <div
              key={conversation.id}
              className={`group flex items-center gap-2 rounded-xl p-2 transition-all duration-200 ${conversation.id === activeConversationId
                ? 'bg-white/15'
                : 'bg-white/5 hover:bg-white/10'
                }`}
            >

              <button
                className="flex-1 text-left"
                type="button"
                onClick={() =>
                  setActiveConversationId(
                    conversation.id
                  )
                }
              >

                <h2 className="truncate font-medium">
                  {conversation.title}
                </h2>

                <p className="mt-1 truncate text-sm text-gray-400">
                  {conversation.lastMessage}
                </p>

              </button>

              <button
                className="opacity-0 transition-all duration-200 hover:scale-110 group-hover:opacity-100"
                type="button"
                onClick={() =>
                  handleDeleteConversation(
                    conversation.id
                  )
                }
              >
                🗑️
              </button>

            </div>

          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-white/10 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-lg font-bold">
            W
          </div>

          <div>
            <h3 className="font-semibold">Weverton</h3>
            <p className="text-sm text-gray-400">Online</p>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col bg-[#0b1120]">
        <header className="flex h-[80px] items-center justify-between border-b border-white/10 px-8">
          <div>
            <h2 className="text-xl font-semibold">{activeConversation?.title || 'Nova conversa'}</h2>
            <p className="text-sm text-gray-400">Modelo: GPT-4.1 Mini</p>
          </div>

          <button
            className="rounded-xl bg-red-500 px-5 py-2 font-medium transition-all duration-200 hover:bg-red-600"
            type="button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-8">
          {activeConversation?.messages.length ? (
            <>
              {activeConversation.messages.map((conversationMessage) => (
                <div
                  key={conversationMessage.id}
                  className={conversationMessage.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                >
                  <div
                    className={`max-w-[700px] px-5 py-4 ${conversationMessage.role === 'user'
                      ? 'rounded-2xl rounded-br-md bg-blue-600 shadow-lg'
                      : 'rounded-2xl rounded-bl-md border border-white/10 bg-white/10 backdrop-blur-sm'
                      }`}
                  >
                    <p className={conversationMessage.role === 'assistant' ? 'leading-7 text-gray-100' : undefined}>
                      {conversationMessage.content}
                    </p>
                  </div>
                </div>
              ))}

              {isAssistantTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[700px] rounded-2xl rounded-bl-md border border-white/10 bg-white/10 px-5 py-4 text-gray-300 backdrop-blur-sm">
                    Respondendo...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="grid h-full place-items-center text-center text-gray-400">
              <div>
                <h2 className="text-xl font-semibold text-white">Nova conversa pronta</h2>
                <p className="mt-2 text-sm">Digite uma mensagem para começar.</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 bg-[#111827] p-6">
          <div className="mx-auto flex max-w-[1100px] items-center gap-4">
            <textarea
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSendMessage();
                }
              }}
              className="h-[70px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 p-5 text-white outline-none placeholder:text-gray-400"
            />

            <button
              className="h-[70px] rounded-2xl bg-blue-600 px-8 font-semibold shadow-lg transition-all duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-900 disabled:text-gray-400"
              type="button"
              onClick={handleSendMessage}
              disabled={isAssistantTyping}
            >
              Enviar
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
