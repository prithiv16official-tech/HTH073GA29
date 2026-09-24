import React, { useState, useEffect, useRef } from 'react';
import { HeroSearch } from './components/HeroSearch';
import { ConversationalMessage } from './components/ConversationalMessage';
import { ChatNavbar } from './components/ChatNavbar';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatInputBar } from './components/ChatInputBar';
import { TeachAiModal } from './components/TeachAiModal';
import { PreferencesModal } from './components/PreferencesModal';
import { SampleModal } from './components/SampleModal';
import {
  AssistantMessageData,
  ConversationTurnState,
  UserPreferences,
  SupportedLanguage,
  VoiceAssistantState,
} from './types/assistant';
import { Dataset, SampleDatasetDefinition } from './types/dataset';
import { parseFile, createDatasetFromSample } from './utils/fileParser';
import { SAMPLE_DATASETS } from './data/sampleDatasets';
import { processConversationalQuery } from './utils/conversationalEngine';
import { generateGeminiVisualization } from './utils/aiVisualizationEngine';
import { getUserPreferences, saveUserPreferences } from './utils/customKnowledge';
import {
  speakTextAloud,
  stopSpeech,
  startVoiceRecognition,
  VoiceRecognitionController,
} from './utils/speechUtils';
import { Radio, X, Mic } from 'lucide-react';

interface StoredSession {
  id: string;
  title: string;
  timestamp: string;
  messages: AssistantMessageData[];
  turnState: ConversationTurnState;
  datasetName?: string;
}

const STORAGE_KEY_SESSIONS = 'datamind_chat_sessions_v3';

export default function App() {
  const [messages, setMessages] = useState<AssistantMessageData[]>([]);
  const [turnState, setTurnState] = useState<ConversationTurnState>({});
  const [preferences, setPreferences] = useState<UserPreferences>(() => getUserPreferences());
  const [activeDataset, setActiveDataset] = useState<Dataset | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isTeachAiOpen, setIsTeachAiOpen] = useState<boolean>(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState<boolean>(false);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState<boolean>(false);

  // Real Voice Assistant States (Requirement 12, 13, 26)
  const [voiceState, setVoiceState] = useState<VoiceAssistantState>('idle');
  const [lastVoiceTranscript, setLastVoiceTranscript] = useState<string>('');
  const [lastVoiceError, setLastVoiceError] = useState<string>('');
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [isVoiceModeActive, setIsVoiceModeActive] = useState<boolean>(false);

  // Active voice mode recognition handle
  const voiceModeSessionRef = useRef<VoiceRecognitionController | null>(null);

  // Sessions History
  const [sessions, setSessions] = useState<StoredSession[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
    } catch (e) {
      console.warn('Failed to save sessions:', e);
    }
  }, [sessions]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSearching]);

  // Sync Voice Mode with preferences
  useEffect(() => {
    if (preferences.voiceMode && !isVoiceModeActive) {
      setIsVoiceModeActive(true);
    } else if (!preferences.voiceMode && isVoiceModeActive) {
      setIsVoiceModeActive(false);
      if (voiceModeSessionRef.current) {
        voiceModeSessionRef.current.abort();
        voiceModeSessionRef.current = null;
      }
    }
  }, [preferences.voiceMode]);

  // Stop any voice session on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
      if (voiceModeSessionRef.current) {
        voiceModeSessionRef.current.abort();
      }
    };
  }, []);

  // Handle Dataset Attachment (CSV, XLSX, XLS)
  const handleAttachDataset = async (file: File) => {
    try {
      const parsed = await parseFile(file);
      setActiveDataset(parsed);

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const confirmMsg: AssistantMessageData = {
        id: `upload-${Date.now()}`,
        sender: 'assistant',
        timestamp: timeStr,
        text: `${file.name} uploaded successfully.`,
        language: preferences.preferredLanguage !== 'auto' ? preferences.preferredLanguage : 'en',
        availableActions: [],
        inferredSchema: parsed.inferredSchema,
      };

      setMessages((prev) => [...prev, confirmMsg]);
      setTurnState({});
    } catch (err: any) {
      console.error('File parse error:', err);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const errorMsg: AssistantMessageData = {
        id: `upload-err-${Date.now()}`,
        sender: 'assistant',
        timestamp: timeStr,
        text: `Could not parse ${file.name}: ${err.message || 'Invalid format'}`,
        language: 'en',
        availableActions: [],
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  // Handle Sample Dataset Selection (Benchmark Unseen Schemas)
  const handleSelectSample = (sample: SampleDatasetDefinition) => {
    try {
      const parsed = createDatasetFromSample(sample.id, sample.name, sample.data);
      setActiveDataset(parsed);

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const confirmMsg: AssistantMessageData = {
        id: `sample-${Date.now()}`,
        sender: 'assistant',
        timestamp: timeStr,
        text: `${sample.name} loaded successfully.`,
        language: preferences.preferredLanguage !== 'auto' ? preferences.preferredLanguage : 'en',
        availableActions: [],
        inferredSchema: parsed.inferredSchema,
      };

      setMessages((prev) => [...prev, confirmMsg]);
      setTurnState({});
    } catch (err: any) {
      console.error('Failed to load sample dataset:', err);
    }
  };

  const handleSelectBenchmark = (schemaId: string) => {
    const found = SAMPLE_DATASETS.find((s) => s.id === schemaId);
    if (found) {
      handleSelectSample(found);
    }
  };

  // Continuous Hands-Free Voice Mode Loop (Requirement 11)
  const triggerVoiceModeListening = () => {
    if (!isVoiceModeActive) return;

    setVoiceState('listening');
    const controller = startVoiceRecognition({
      language: preferences.voiceLanguage || preferences.preferredLanguage,
      onTranscriptChange: (text) => {
        setLastVoiceTranscript(text);
      },
      onFinalTranscript: (text) => {
        setLastVoiceTranscript(text);
        setVoiceState('processing');
        handleQuery(text, true); // send to AI
      },
      onStateChange: (state, detail) => {
        setVoiceState(state);
        if (state === 'error' && detail) {
          setLastVoiceError(detail);
        }
      },
      onError: (err, code, isPerm) => {
        setLastVoiceError(err);
        setVoiceState('error');
        // Stop looping if permission denied or unsupported
        if (isPerm || code === 'speech_unsupported' || code === 'insecure_context' || code === 'not_allowed') {
          setIsVoiceModeActive(false);
        } else {
          setTimeout(() => {
            if (isVoiceModeActive) triggerVoiceModeListening();
          }, 3000);
        }
      },
      onEnd: () => {
        voiceModeSessionRef.current = null;
      },
    });

    voiceModeSessionRef.current = controller;
  };

  // Core Natural Language Query Processor
  const handleQuery = async (rawQuery: string, fromVoiceMode = false) => {
    const trimmed = rawQuery.trim();
    if (!trimmed || isSearching) return;

    // Interrupt any active speech before answering new question (Requirement 15)
    stopSpeech();
    setIsAiSpeaking(false);

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = `user-${Date.now()}`;
    const asstMsgId = `asst-${Date.now()}`;

    // 1. User Message
    const userMsg: AssistantMessageData = {
      id: userMsgId,
      sender: 'user',
      timestamp: timeStr,
      text: trimmed,
      language: preferences.preferredLanguage !== 'auto' ? preferences.preferredLanguage : 'en',
      availableActions: [],
    };

    // 2. Pending Assistant Message
    const pendingAsstMsg: AssistantMessageData = {
      id: asstMsgId,
      sender: 'assistant',
      timestamp: timeStr,
      text: '',
      language: preferences.preferredLanguage !== 'auto' ? preferences.preferredLanguage : 'en',
      availableActions: [],
    };

    const newMessages = [...messages, userMsg, pendingAsstMsg];
    setMessages(newMessages);
    setIsSearching(true);

    try {
      await new Promise((r) => setTimeout(r, 180));

      // Execute progressive disclosure engine with multi-turn state & dataset
      const { message: resultMessage, updatedState } = processConversationalQuery(
        trimmed,
        turnState,
        preferences,
        activeDataset
      );

      // Check if user requested visualization or if message includes chart
      const isVisualQuery =
        /chart|visual|plot|graph|histogram|distribution|scatter|trend|breakdown|compare|bar|pie|line|box/i.test(trimmed) ||
        resultMessage.hasChart ||
        Boolean(resultMessage.visualizationNotice);

      if (activeDataset && isVisualQuery) {
        try {
          const aiVis = await generateGeminiVisualization(trimmed, activeDataset);
          resultMessage.hasChart = true;
          resultMessage.chart = aiVis.chart;
          resultMessage.chartAxisInfo = aiVis.chartAxisInfo;
          resultMessage.technicalDetails = aiVis.technicalDetails;
          resultMessage.visualizationNotice = undefined;
          if (!resultMessage.text || resultMessage.text.length < 15) {
            resultMessage.text = aiVis.summaryText;
          }
          if (!resultMessage.calculationSteps || resultMessage.calculationSteps.length === 0) {
            resultMessage.calculationSteps = aiVis.calculationSteps;
          }
        } catch (visErr) {
          console.warn('Gemini visualization error:', visErr);
        }
      } else if (activeDataset && !resultMessage.technicalDetails && (resultMessage.isAnalyticalResult || resultMessage.queryPlan)) {
        // Attach technical details for non-chart analytical results as well
        const cols = activeDataset.columns || [];
        const primaryMetric = resultMessage.queryPlan?.metric || resultMessage.executionResult?.metricColumn;
        const primaryDim = resultMessage.queryPlan?.groupBy || resultMessage.executionResult?.groupBy;
        const matchedCols = cols.filter(c => c.name === primaryMetric || c.name === primaryDim);
        const selectedCols = matchedCols.length > 0 ? matchedCols : cols.slice(0, 2);

        resultMessage.technicalDetails = {
          datasetName: activeDataset.name,
          totalRowsAnalyzed: activeDataset.rowCount,
          totalColumnsCount: activeDataset.columnCount,
          columnsUsed: selectedCols.map(c => ({
            name: c.name,
            type: c.type,
            role: c.isNumerical ? 'Target Metric' : 'Grouping Dimension',
            sampleValues: c.sampleValues?.slice(0, 3),
            uniqueCount: c.uniqueCount,
          })),
          operationApplied: resultMessage.queryPlan ? `${resultMessage.queryPlan.operation} on ${resultMessage.queryPlan.metric}` : 'Deterministic Data Evaluation',
          aggregationFormula: resultMessage.queryPlan ? `${resultMessage.queryPlan.operation}(${resultMessage.queryPlan.metric || '*'})` : undefined,
          modelUsed: 'Gemini Flash (gemini-3.8-flash)',
          generationStrategy: 'Dynamic Schema Evaluation',
          sqlRepresentation: resultMessage.queryPlan ? `SELECT ${primaryDim ? `[${primaryDim}], ` : ''}${resultMessage.queryPlan.operation}([${primaryMetric || '*'}]) FROM dataset ${primaryDim ? `GROUP BY [${primaryDim}]` : ''}` : undefined,
          aiExplanation: 'Analyzed using schema-aware inference engine and validated deterministic execution.',
        };
      }

      resultMessage.id = asstMsgId;
      resultMessage.timestamp = timeStr;

      setTurnState(updatedState);

      const finalMessages = newMessages.map((m) => (m.id === asstMsgId ? resultMessage : m));
      setMessages(finalMessages);

      // Handle Speech Output (TTS) & Voice Mode
      const shouldSpeak = preferences.voiceAutoRead || fromVoiceMode || isVoiceModeActive;
      if (shouldSpeak && resultMessage.text) {
        setIsAiSpeaking(true);
        setVoiceState('speaking');

        speakTextAloud(
          resultMessage.text,
          resultMessage.language,
          () => {
            setIsAiSpeaking(true);
            setVoiceState('speaking');
          },
          () => {
            setIsAiSpeaking(false);
            setVoiceState('idle');
            // If in continuous Voice Mode: start listening again for hands-free loop!
            if (isVoiceModeActive) {
              setTimeout(() => triggerVoiceModeListening(), 500);
            }
          },
          () => {
            setIsAiSpeaking(false);
            setVoiceState('idle');
            if (isVoiceModeActive) {
              setTimeout(() => triggerVoiceModeListening(), 1000);
            }
          }
        );
      }

      // Update or create active session history entry
      const currentSessionTitle =
        messages.filter((m) => m.sender === 'user').length === 0
          ? trimmed
          : sessions.find((s) => s.id === activeSessionId)?.title || trimmed;

      const currentId = activeSessionId || `session-${Date.now()}`;

      setActiveSessionId(currentId);
      setSessions((prev) => {
        const existing = prev.filter((s) => s.id !== currentId);
        return [
          {
            id: currentId,
            title: currentSessionTitle,
            timestamp: timeStr,
            messages: finalMessages,
            turnState: updatedState,
            datasetName: activeDataset?.name,
          },
          ...existing,
        ].slice(0, 30);
      });
    } catch (err) {
      console.error('Error processing query:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstMsgId
            ? {
                ...m,
                text: 'Sorry, I encountered an issue processing that question. Please try rephrasing.',
              }
            : m
        )
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Stop AI speech immediately (Interrupt AI Speech - Requirement 15)
  const handleStopAiSpeech = () => {
    stopSpeech();
    setIsAiSpeaking(false);
    setVoiceState('idle');
  };

  // Exit Voice Mode (Requirement 11)
  const handleEndVoiceMode = () => {
    setIsVoiceModeActive(false);
    stopSpeech();
    setIsAiSpeaking(false);
    if (voiceModeSessionRef.current) {
      voiceModeSessionRef.current.abort();
      voiceModeSessionRef.current = null;
    }
    setVoiceState('idle');
    const updated = { ...preferences, voiceMode: false };
    setPreferences(updated);
    saveUserPreferences(updated);
  };

  // Start Voice Mode
  const handleStartVoiceMode = () => {
    setIsVoiceModeActive(true);
    const updated = { ...preferences, voiceMode: true };
    setPreferences(updated);
    saveUserPreferences(updated);
    setTimeout(() => triggerVoiceModeListening(), 300);
  };

  // Start New Chat
  const handleNewChat = () => {
    stopSpeech();
    setIsAiSpeaking(false);
    setMessages([]);
    setTurnState({});
    setActiveSessionId(null);
  };

  // Restore previous session from history
  const handleSelectSession = (id: string) => {
    stopSpeech();
    setIsAiSpeaking(false);
    const session = sessions.find((s) => s.id === id);
    if (!session) return;

    setActiveSessionId(session.id);
    setMessages(session.messages);
    setTurnState(session.turnState);
  };

  // Clear all sessions
  const handleClearHistory = () => {
    stopSpeech();
    setIsAiSpeaking(false);
    setSessions([]);
    setActiveSessionId(null);
    setMessages([]);
    setTurnState({});
  };

  // Language selector change
  const handleChangeLanguage = (lang: SupportedLanguage) => {
    const updated: UserPreferences = {
      ...preferences,
      preferredLanguage: lang,
      voiceLanguage: lang,
    };
    setPreferences(updated);
    saveUserPreferences(updated);
  };

  // Voice state callback from input bars
  const handleVoiceStateNotification = (
    state: VoiceAssistantState,
    transcript = '',
    error = ''
  ) => {
    setVoiceState(state);
    if (transcript) setLastVoiceTranscript(transcript);
    if (error) setLastVoiceError(error);
  };

  const activeVoiceLang = preferences.voiceLanguage || preferences.preferredLanguage || 'auto';

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* ChatGPT-style Left History Sidebar */}
      <ChatSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        history={sessions.map((s) => ({ id: s.id, title: s.title, timestamp: s.timestamp }))}
        activeId={activeSessionId}
        activeDatasetName={activeDataset?.name}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onClearHistory={handleClearHistory}
        onOpenTeachAi={() => setIsTeachAiOpen(true)}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Navbar */}
        <ChatNavbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNewChat={handleNewChat}
          onOpenTeachAi={() => setIsTeachAiOpen(true)}
          onOpenPreferences={() => setIsPreferencesOpen(true)}
          onOpenSampleModal={() => setIsSampleModalOpen(true)}
          selectedLanguage={preferences.preferredLanguage}
          onChangeLanguage={handleChangeLanguage}
          hasMessages={messages.length > 0}
        />

        {/* Voice Mode Banner (Requirement 11 - [End Voice Mode]) */}
        {isVoiceModeActive && (
          <div className="bg-purple-600 text-white px-4 py-2 flex items-center justify-between shadow-xs animate-fadeIn shrink-0">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <Radio className="w-4 h-4 animate-pulse" />
              <span>
                <strong>Voice Mode Active</strong> — Hands-free conversation (
                {voiceState === 'listening'
                  ? 'Listening...'
                  : voiceState === 'speaking'
                  ? 'Speaking...'
                  : voiceState === 'processing'
                  ? 'Analyzing data...'
                  : 'Ready'}
                )
              </span>
            </div>
            <button
              type="button"
              onClick={handleEndVoiceMode}
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>End Voice Mode</span>
            </button>
          </div>
        )}

        {/* Conversation / Hero Scroll Area */}
        <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar">
          {messages.length === 0 ? (
            /* Home Screen: Center DataMind AI, Subtitle, and ONE large ChatGPT input box with Attach, Voice, Send */
            <HeroSearch
              onSearch={handleQuery}
              onAttachDataset={handleAttachDataset}
              isSearching={isSearching}
              selectedLanguage={activeVoiceLang}
              onLanguageChange={handleChangeLanguage}
              autoSend={preferences.voiceAutoSend}
              isAiSpeaking={isAiSpeaking}
              onStopAiSpeech={handleStopAiSpeech}
              onVoiceStateChange={handleVoiceStateNotification}
              onSelectBenchmark={handleSelectBenchmark}
              onOpenSampleModal={() => setIsSampleModalOpen(true)}
            />
          ) : (
            /* Conversational Thread View */
            <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
              {messages.map((msg) => (
                <ConversationalMessage
                  key={msg.id}
                  message={msg}
                  onTriggerAction={handleQuery}
                  isLoading={msg.sender === 'assistant' && !msg.text && isSearching}
                />
              ))}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Floating Input Bar with Attach, Voice, Send (Shown in conversation mode) */}
        {messages.length > 0 && (
          <ChatInputBar
            onSendMessage={handleQuery}
            onAttachDataset={handleAttachDataset}
            isLoading={isSearching}
            selectedLanguage={activeVoiceLang}
            onLanguageChange={handleChangeLanguage}
            autoSend={preferences.voiceAutoSend}
            isAiSpeaking={isAiSpeaking}
            onStopAiSpeech={handleStopAiSpeech}
            onVoiceStateChange={handleVoiceStateNotification}
          />
        )}
      </div>

      {/* Sample & Benchmark Datasets Modal */}
      <SampleModal
        isOpen={isSampleModalOpen}
        onClose={() => setIsSampleModalOpen(false)}
        onSelectSample={handleSelectSample}
        currentDatasetName={activeDataset?.name}
      />

      {/* Teach AI / Custom Knowledge Modal */}
      <TeachAiModal
        isOpen={isTeachAiOpen}
        onClose={() => setIsTeachAiOpen(false)}
        onKnowledgeUpdated={() => {}}
      />

      {/* Preferences / Personalization Modal with Voice Debug Diagnostics */}
      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        preferences={preferences}
        onUpdatePreferences={(updated) => setPreferences(updated)}
        currentVoiceState={voiceState}
        lastVoiceTranscript={lastVoiceTranscript}
        lastVoiceError={lastVoiceError}
      />
    </div>
  );
}
