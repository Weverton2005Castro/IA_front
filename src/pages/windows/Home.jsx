import { useMemo, useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import {collection, getDocs, setDoc, doc, deleteDoc} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { sendChatMessage } from '../../services/api';

export default function Home() {
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [message, setMessage] = useState('');
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);

  // MOBILE
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const messagesEndRef = useRef(null);

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) =>
          conversation.id === activeConversationId
      ),
    [activeConversationId, conversations]
  );

  // CARREGAR CONVERSAS
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

  // SCROLL AUTOMÁTICO
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [activeConversation]);

  // SALVAR CONVERSA
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

  // NOVA CONVERSA
  async function handleNewConversation() {
    const nextConversation = {
      id: Date.now(),
      title: `Nova conversa ${conversations.length + 1}`,
      lastMessage: 'Sem mensagens ainda',
      messages: [],
    };

    setConversations((current) => [
      nextConversation,
      ...current,
    ]);

    setActiveConversationId(
      nextConversation.id
    );

    setMessage('');

    setIsSidebarOpen(false);

    await saveConversation(nextConversation);
  }

  // DELETAR CONVERSA
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

      setConversations(updatedConversations);

      if (
        activeConversationId === conversationId
      ) {
        setActiveConversationId(
          updatedConversations[0]?.id || null
        );
      }
    } catch (error) {
      console.error(error);
    }
  }

  // ENVIAR MENSAGEM
  async function handleSendMessage() {
    const trimmedMessage = message.trim();

    if (
      !trimmedMessage ||
      !activeConversation
    ) {
      return;
    }

    const nextMessage = {
      id: Date.now(),
      role: 'user',
      content: trimmedMessage,
    };

    const conversationId =
      activeConversation.id;

    const updatedConversation = {
      ...activeConversation,
      title:
        activeConversation.messages.length === 0
          ? trimmedMessage.slice(0, 32)
          : activeConversation.title,

      lastMessage: trimmedMessage,

      messages: [
        ...activeConversation.messages,
        nextMessage,
      ],
    };

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? updatedConversation
          : conversation
      )
    );

    setMessage('');
    setIsAssistantTyping(true);

    await saveConversation(
      updatedConversation
    );

    try {
      const response =
        await sendChatMessage({
          message: trimmedMessage,
          history:
            activeConversation.messages,
        });

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response,
      };

      const finalConversation = {
        ...updatedConversation,
        lastMessage:
          assistantMessage.content,

        messages: [
          ...updatedConversation.messages,
          assistantMessage,
        ],
      };

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? finalConversation
            : conversation
        )
      );

      await saveConversation(
        finalConversation
      );
    } catch (error) {
      console.error(error);

      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content:
          error.message ||
          'Erro ao consultar a IA',
      };

      const finalConversation = {
        ...updatedConversation,
        lastMessage:
          errorMessage.content,

        messages: [
          ...updatedConversation.messages,
          errorMessage,
        ],
      };

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? finalConversation
            : conversation
        )
      );

      await saveConversation(
        finalConversation
      );
    } finally {
      setIsAssistantTyping(false);
    }
  }

  // LOGOUT
  async function handleLogout() {
    await signOut(auth);
    navigate('/');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f172a] text-white">

      {/* OVERLAY MOBILE */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() =>
            setIsSidebarOpen(false)
          }
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed
          left-0
          top-0
          z-50
          flex
          h-full
          w-[280px]
          flex-col
          border-r
          border-white/10
          bg-[#111827]
          transition-transform
          duration-300

          ${isSidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full'}

          md:relative
          md:translate-x-0
        `}
      >
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Chat AI
              </h1>

              <p className="mt-1 text-sm text-gray-400">
                Seu assistente inteligente
              </p>
            </div>

            {/* FECHAR MOBILE */}
            <button
              className="text-2xl md:hidden"
              onClick={() =>
                setIsSidebarOpen(false)
              }
            >
              ✕
            </button>
          </div>
        </div>

        {/* NOVA CONVERSA */}
        <div className="p-4">
          <button
            className="w-full rounded-xl bg-blue-600 p-3 font-semibold transition hover:bg-blue-700"
            onClick={handleNewConversation}
          >
            + Nova Conversa
          </button>
        </div>

        {/* LISTA */}
        <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
          {conversations.map(
            (conversation) => (
              <div
                key={conversation.id}
                className={`
                  group
                  flex
                  items-center
                  gap-2
                  rounded-xl
                  p-2
                  transition

                  ${conversation.id ===
                    activeConversationId
                    ? 'bg-white/15'
                    : 'bg-white/5 hover:bg-white/10'}
                `}
              >
                <button
                  className="flex-1 text-left"
                  onClick={() => {
                    setActiveConversationId(
                      conversation.id
                    );

                    setIsSidebarOpen(false);
                  }}
                >
                  <h2 className="truncate font-medium">
                    {conversation.title}
                  </h2>

                  <p className="mt-1 w-[180px] truncate text-sm text-gray-400">
                    {conversation.lastMessage}
                  </p>
                </button>

                <button
                  className="text-lg opacity-100 transition hover:scale-110 md:opacity-0 md:group-hover:opacity-100"
                  onClick={() =>
                    handleDeleteConversation(
                      conversation.id
                    )
                  }
                >
                  🗑️
                </button>
              </div>
            )
          )}
        </div>

        {/* USER */}
        <div className="flex items-center gap-3 border-t border-white/10 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 font-bold">
            W
          </div>

          <div>
            <h3 className="font-semibold">
              Weverton
            </h3>

            <p className="text-sm text-gray-400">
              Online
            </p>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex flex-1 flex-col bg-[#0b1120]">

        {/* HEADER */}
        <header className="flex min-h-[70px] items-center justify-between border-b border-white/10 px-4 md:px-8">

          <div className="flex items-center gap-3">

            {/* MENU MOBILE */}
            <button
              className="text-2xl md:hidden"
              onClick={() =>
                setIsSidebarOpen(true)
              }
            >
              ☰
            </button>

            <div>
              <h2 className="max-w-[180px] truncate text-lg font-semibold md:max-w-full md:text-xl">
                {activeConversation?.title ||
                  'Nova conversa'}
              </h2>

              <p className="text-sm text-gray-400">
                Modelo: GPT-4.1 Mini
              </p>
            </div>
          </div>

          <button
            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium transition hover:bg-red-600 md:px-5"
            onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        {/* MENSAGENS */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 md:space-y-6 md:p-8">

          {activeConversation?.messages
            ?.length ? (
            <>
              {activeConversation.messages.map(
                (
                  conversationMessage
                ) => (
                  <div
                    key={
                      conversationMessage.id
                    }
                    className={
                      conversationMessage.role ===
                        'user'
                        ? 'flex justify-end'
                        : 'flex justify-start'
                    }
                  >
                    <div
                      className={`
                        max-w-[90%]
                        px-4
                        py-3
                        text-sm
                        md:max-w-[700px]
                        md:px-5
                        md:py-4
                        md:text-base

                        ${conversationMessage.role ===
                          'user'
                          ? 'rounded-2xl rounded-br-md bg-blue-600 shadow-lg'
                          : 'rounded-2xl rounded-bl-md border border-white/10 bg-white/10 backdrop-blur-sm'}
                      `}
                    >
                      <p className="whitespace-pre-wrap break-words leading-7 text-gray-100">
                        {
                          conversationMessage.content
                        }
                      </p>
                    </div>
                  </div>
                )
              )}

              {isAssistantTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-white/10 bg-white/10 px-4 py-3 text-sm text-gray-300 md:max-w-[700px] md:px-5 md:py-4 md:text-base">
                    Respondendo...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="grid h-full place-items-center text-center text-gray-400">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Nova conversa pronta
                </h2>

                <p className="mt-2 text-sm">
                  Digite uma mensagem para
                  começar.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* INPUT */}
        <div className="border-t border-white/10 bg-[#111827] p-4 md:p-6">

          <div className="mx-auto flex max-w-[1100px] items-end gap-3">

            <textarea
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  handleSendMessage();
                }
              }}
              className="
                min-h-[60px]
                flex-1
                resize-none
                rounded-2xl
                border
                border-white/10
                bg-white/5
                p-4
                text-sm
                text-white
                outline-none
                placeholder:text-gray-400
                md:text-base
              "
            />

            <button
              className="
                h-[60px]
                rounded-2xl
                bg-blue-600
                px-5
                text-sm
                font-semibold
                transition
                hover:bg-blue-700
                disabled:cursor-not-allowed
                disabled:bg-blue-900
                md:px-8
                md:text-base
              "
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